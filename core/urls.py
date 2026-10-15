from django.urls import path
from .views import (
    RegisterView,
    TriggerWebhookView,
    TaskStatusView,
    HealthCheckView,
    GenerateReportView,
    BulkEmailView,
    SenderListCreateView,
    SenderApproveView,
    SenderRejectView,
    SenderApprovedListView,
)

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='register'),

    # Webhook
    path('trigger-webhook/', TriggerWebhookView.as_view(), name='trigger-webhook'),

    # Task status
    path('task-status/<str:task_id>/', TaskStatusView.as_view(), name='task-status'),

    # Health
    path('health/', HealthCheckView.as_view(), name='health-check'),

    # Reports
    path('generate-report/', GenerateReportView.as_view(), name='generate-report'),

    # Bulk Email
    path('send-bulk-email/', BulkEmailView.as_view(), name='send-bulk-email'),

    # Sender Management
    path('senders/', SenderListCreateView.as_view(), name='senders-list-create'),
    path('senders/approved/', SenderApprovedListView.as_view(), name='senders-approved'),
    path('senders/<int:pk>/approve/', SenderApproveView.as_view(), name='senders-approve'),
    path('senders/<int:pk>/reject/', SenderRejectView.as_view(), name='senders-reject'),
]