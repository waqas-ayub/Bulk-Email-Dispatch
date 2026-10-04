from django.urls import path
from .views import (
    RegisterView,
    TriggerWebhookView,
    TaskStatusView,
    HealthCheckView,
    GenerateReportView,
    BulkEmailView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('trigger-webhook/', TriggerWebhookView.as_view(), name='trigger-webhook'),
    path('task-status/<str:task_id>/', TaskStatusView.as_view(), name='task-status'),
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('generate-report/', GenerateReportView.as_view(), name='generate-report'),
    path('send-bulk-email/', BulkEmailView.as_view(), name='send-bulk-email'),
]