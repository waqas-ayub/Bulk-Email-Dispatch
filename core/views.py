from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.utils import timezone
from celery.result import AsyncResult
from django.core.cache import cache

from .serializers import (
    UserRegisterSerializer,
    SenderSerializer,
    SenderCreateSerializer,
)
from .tasks import send_webhook_notification, send_bulk_emails_task
from .models import Sender

User = get_user_model()


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegisterSerializer


# ---------------------------------------------------------------------------
# WEBHOOK
# ---------------------------------------------------------------------------
class TriggerWebhookView(APIView):
    def post(self, request):
        target_url = request.data.get("target_url")
        payload = request.data.get("payload", {})

        if not target_url:
            return Response(
                {"error": "target_url is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task = send_webhook_notification.delay(target_url, payload)

        return Response({
            "message": "Webhook task queued successfully",
            "task_id": task.id,
            "status_check_url": f"/api/task-status/{task.id}/"
        }, status=status.HTTP_202_ACCEPTED)


# ---------------------------------------------------------------------------
# TASK STATUS
# ---------------------------------------------------------------------------
class TaskStatusView(APIView):
    def get(self, request, task_id):
        task_result = AsyncResult(task_id)

        response_data = {
            "task_id": task_id,
            "status": task_result.status,
            "result": None,
            "error": None
        }

        if task_result.state == 'SUCCESS':
            response_data["result"] = task_result.result
        elif task_result.state == 'FAILURE':
            response_data["error"] = str(task_result.result)

        return Response(response_data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------------------------
class HealthCheckView(APIView):
    def get(self, request):
        try:
            cache.set("health_check", "ok", 10)
            redis_status = "healthy" if cache.get("health_check") == "ok" else "unhealthy"
        except Exception:
            redis_status = "unhealthy"

        return Response({
            "status": "healthy" if redis_status == "healthy" else "degraded",
            "services": {
                "database": "healthy",
                "redis_broker": redis_status
            }
        }, status=status.HTTP_200_OK if redis_status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE)


# ---------------------------------------------------------------------------
# REPORT (placeholder)
# ---------------------------------------------------------------------------
class GenerateReportView(APIView):
    def post(self, request):
        return Response(
            {"message": "Report generation endpoint ready"},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# BULK EMAIL DISPATCH
# ---------------------------------------------------------------------------
class BulkEmailView(APIView):
    """
    POST /api/send-bulk-email/

    Body:
        {
            "email_list": ["a@x.com", "b@y.com", ...],
            "subject":    "Hello",
            "message":    "Body text",
            "sender_id":  123
        }

    Queues a Celery task and returns 202 with task_id.
    """
    permission_classes = [IsAuthenticated]

    MAX_RECIPIENTS = 500

    def post(self, request):
        email_list = request.data.get("email_list")
        subject    = request.data.get("subject")
        message    = request.data.get("message")
        sender_id  = request.data.get("sender_id")

        if not isinstance(email_list, list) or not email_list:
            return Response(
                {"error": "email_list must be a non-empty list of addresses"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not subject or not message:
            return Response(
                {"error": "subject and message are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(email_list) > self.MAX_RECIPIENTS:
            return Response(
                {
                    "error": f"Too many recipients ({len(email_list)}). "
                             f"Max is {self.MAX_RECIPIENTS} per request."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        task = send_bulk_emails_task.delay(email_list, subject, message, sender_id)

        return Response(
            {
                "message":    "Bulk email task queued successfully",
                "task_id":    task.id,
                "recipients": len(email_list),
                "status_check_url": f"/api/task-status/{task.id}/",
            },
            status=status.HTTP_202_ACCEPTED,
        )


# ---------------------------------------------------------------------------
# SENDER MANAGEMENT
# ---------------------------------------------------------------------------
class SenderListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/senders/  → list current user's senders
    POST /api/senders/  → create new sender (status=pending)
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SenderCreateSerializer
        return SenderSerializer

    def get_queryset(self):
        # Only current user's senders
        return Sender.objects.filter(added_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        read_serializer = SenderSerializer(serializer.instance)
        return Response(
            {
                "message": "Sender added successfully. Awaiting admin approval.",
                "sender": read_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class SenderApproveView(APIView):
    """POST /api/senders/<pk>/approve/ — admin approves a sender."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            sender = Sender.objects.get(pk=pk)
        except Sender.DoesNotExist:
            return Response(
                {"error": "Sender not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        sender.status = 'approved'
        sender.approved_by = request.user
        sender.approved_at = timezone.now()
        sender.rejection_reason = ''
        sender.save()

        return Response({
            "message": f"Sender '{sender.display_name}' approved.",
            "sender": SenderSerializer(sender).data,
        })


class SenderRejectView(APIView):
    """POST /api/senders/<pk>/reject/ — admin rejects a sender."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            sender = Sender.objects.get(pk=pk)
        except Sender.DoesNotExist:
            return Response(
                {"error": "Sender not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        reason = request.data.get('reason', '')

        sender.status = 'rejected'
        sender.approved_by = request.user
        sender.approved_at = timezone.now()
        sender.rejection_reason = reason
        sender.save()

        return Response({
            "message": f"Sender '{sender.display_name}' rejected.",
            "sender": SenderSerializer(sender).data,
        })


class SenderApprovedListView(APIView):
    """
    GET /api/senders/approved/ — list current user's approved senders (for dropdown).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        senders = Sender.objects.filter(
            added_by=request.user,
            status='approved',
        )
        serializer = SenderSerializer(senders, many=True)
        return Response({"senders": serializer.data})