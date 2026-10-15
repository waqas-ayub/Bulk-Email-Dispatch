from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_premium = models.BooleanField(default=False)
    
    # NEW FIELDS
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="For WhatsApp OTP verification (future)",
    )
    trial_started_at = models.DateTimeField(auto_now_add=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

    @property
    def is_trial_active(self):
        """Check if user's 7-day free trial is still active."""
        from django.utils import timezone
        if not self.trial_ends_at:
            return False
        return timezone.now() < self.trial_ends_at


class Sender(models.Model):
    """
    A sender email address that can be used for bulk email dispatch.
    Team members add senders; admins approve them.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='senders',
    )

    display_name = models.CharField(max_length=100)
    email = models.EmailField()

    smtp_host = models.CharField(max_length=100, default='smtp.gmail.com')
    smtp_port = models.IntegerField(default=465)
    smtp_username = models.CharField(max_length=255)
    smtp_password = models.CharField(max_length=255)
    use_ssl = models.BooleanField(default=True)
    use_tls = models.BooleanField(default=False)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_senders',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('email', 'added_by')

    def __str__(self):
        return f"{self.display_name} <{self.email}> [{self.status}]"

    @property
    def is_approved(self):
        return self.status == 'approved'