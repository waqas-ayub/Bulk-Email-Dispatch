import logging
import requests
from celery import shared_task
from django_celery_results.models import TaskResult
from django.utils import timezone
from django.core.mail import send_mass_mail, get_connection
from django.conf import settings
from datetime import timedelta

logger = logging.getLogger(__name__) 


@shared_task(
    bind=True, 
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(requests.RequestException, Exception),
    retry_backoff=True,
    rate_limit='10/m',
)
def send_webhook_notification(self, target_url, payload):
    """
    Background task to send Webhooks with Auto-Retry and Rate Limiting (10/min).
    """
    logger.info(f"Triggering webhook to {target_url} [Attempt {self.request.retries + 1}]")

    try:
        response = requests.post(target_url, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Webhook delivered successfully to {target_url}")
        return {
            "status": "SUCCESS",
            "status_code": response.status_code,
            "target_url": target_url
        }

    except requests.RequestException as exc:
        logger.error(f"Webhook delivery failed to {target_url}: {str(exc)}")
        raise self.retry(exc=exc)


@shared_task
def cleanup_old_task_results(days=7):
    """
    Periodic background task to remove task result logs older than `days`.
    """
    cutoff_date = timezone.now() - timedelta(days=days)
    deleted_count, _ = TaskResult.objects.filter(date_done__lt=cutoff_date).delete()
    logger.info(f"Automated Cleanup: Purged {deleted_count} expired task results older than {days} days.")
    return {"purged_records": deleted_count}


# ---------------------------------------------------------------------------
# BULK EMAIL DISPATCHING
# ---------------------------------------------------------------------------
@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    retry_backoff=True,
    retry_backoff_max=120,
    retry_jitter=True,
    rate_limit='5/m',
)
def send_bulk_emails_task(self, email_list, subject, message, sender_id=None):
    """
    Send a bulk email using the SELECTED SENDER'S OWN SMTP credentials.
    
    - sender_id REQUIRED hai
    - Har sender ke apne SMTP credentials use honge
    - Nahi hai to FAIL hoga (default .env SMTP use NAHI hoga)
    """
    # ---- 1. Validate input ----
    if not email_list or not isinstance(email_list, list):
        logger.warning("send_bulk_emails_task called with empty/invalid email_list")
        return {"status": "SKIPPED", "reason": "email_list must be a non-empty list"}

    if not subject or not message:
        logger.warning("send_bulk_emails_task called without subject or message")
        return {"status": "SKIPPED", "reason": "subject and message are required"}

    # ---- 2. Resolve sender (REQUIRED) ----
    from core.models import Sender

    if not sender_id:
        logger.error("send_bulk_emails_task called without sender_id. Rejecting.")
        return {
            "status": "FAILED",
            "reason": "No sender selected. Please choose a sender before sending.",
        }

    try:
        sender = Sender.objects.get(id=sender_id, status='approved')
    except Sender.DoesNotExist:
        logger.error(f"Sender {sender_id} not found or not approved.")
        return {
            "status": "FAILED",
            "reason": f"Sender {sender_id} not found or not approved.",
        }
    except Exception as e:
        logger.error(f"Error loading sender {sender_id}: {e}")
        return {
            "status": "FAILED",
            "reason": f"Error loading sender: {e}",
        }

    # Sender's own SMTP credentials
    from_email = f"{sender.display_name} <{sender.email}>"
    logger.info(f"Using sender: {from_email}")
    logger.info(f"SMTP: {sender.smtp_host}:{sender.smtp_port} (user: {sender.smtp_username})")

    # ---- 3. Build datatuples ----
    datatuples = [
        (subject, message, from_email, [addr.strip()])
        for addr in email_list
        if addr and '@' in addr
    ]

    if not datatuples:
        logger.warning("send_bulk_emails_task: no valid addresses after filtering")
        return {"status": "SKIPPED", "reason": "no valid email addresses"}

    logger.info(
        "Bulk email task started [attempt %s] → %s recipients | subject=%r",
        self.request.retries + 1,
        len(datatuples),
        subject,
    )

    # ---- 4. Send using SENDER'S OWN SMTP connection ----
    try:
        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=sender.smtp_host,
            port=sender.smtp_port,
            username=sender.smtp_username,
            password=sender.smtp_password,
            use_tls=sender.use_tls,
            use_ssl=sender.use_ssl,
            fail_silently=False,
            timeout=30,
        )

        sent_count = send_mass_mail(datatuples, fail_silently=False, connection=connection)
        logger.info("Bulk email delivered to %s recipients", sent_count)

        return {
            "status": "SUCCESS",
            "recipients": len(datatuples),
            "sent": sent_count,
            "subject": subject,
            "from_email": from_email,
        }

    except Exception as exc:
        logger.exception("Bulk email dispatch failed: %s", exc)
        raise self.retry(exc=exc)