import logging
import requests
from celery import shared_task
from django_celery_results.models import TaskResult
from django.utils import timezone
from django.core.mail import send_mass_mail
from django.conf import settings
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(requests.RequestException, Exception),
    retry_backoff=True,
    rate_limit='10/m',  # Maximum 10 tasks per minute
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
# NEW: Bulk Email Dispatching
# ---------------------------------------------------------------------------
@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    retry_backoff=True,
    retry_backoff_max=120,
    retry_jitter=True,
    rate_limit='5/m',   # dev me Gmail throttle se bachne ke liye
)
def send_bulk_emails_task(self, email_list, subject, message):
    """
    Send a bulk email to a list of recipients using send_mass_mail.

    send_mass_mail ek hi SMTP connection kholta hai aur sab recipients ke
    liye reuse karta hai — loop me send_mail() se kaafi faster.

    Kisi bhi exception pe retry karega with exponential backoff.
    """
    # ---- 1. Validate input ------------------------------------------------
    if not email_list or not isinstance(email_list, list):
        logger.warning("send_bulk_emails_task called with empty/invalid email_list")
        return {"status": "SKIPPED", "reason": "email_list must be a non-empty list"}

    if not subject or not message:
        logger.warning("send_bulk_emails_task called without subject or message")
        return {"status": "SKIPPED", "reason": "subject and message are required"}

    from_email = settings.DEFAULT_FROM_EMAIL

    # ---- 2. Build datatuples ----------------------------------------------
    # send_mass_mail ko har email ke liye ye tuple chahiye:
    #   (subject, message, from_email, [recipient_list])
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

    # ---- 3. Send ----------------------------------------------------------
    try:
        sent_count = send_mass_mail(datatuples, fail_silently=False)
        logger.info("Bulk email delivered to %s recipients", sent_count)
        return {
            "status": "SUCCESS",
            "recipients": len(datatuples),
            "sent": sent_count,
            "subject": subject,
        }

    except Exception as exc:
        logger.exception("Bulk email dispatch failed: %s", exc)
        # Exponential backoff; 3 retries ke baad give up (total 4 attempts)
        raise self.retry(exc=exc)