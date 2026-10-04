from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from celery.result import AsyncResult
from django.core.cache import cache

from .serializers import UserRegisterSerializer
from .tasks import send_webhook_notification, send_bulk_emails_task

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegisterSerializer


class TriggerWebhookView(APIView):
    def post(self, request):
        target_url = request.data.get("target_url")
        payload = request.data.get("payload", {})

        if not target_url:
            return Response({"error": "target_url is required"}, status=status.HTTP_400_BAD_REQUEST)

        task = send_webhook_notification.delay(target_url, payload)

        return Response({
            "message": "Webhook task queued successfully",
            "task_id": task.id,
            "status_check_url": f"/api/task-status/{task.id}/"
        }, status=status.HTTP_202_ACCEPTED)


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


class HealthCheckView(APIView):
    def get(self, request):
        # Check Redis Cache / Connection
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


class GenerateReportView(APIView):
    def post(self, request):
        return Response({"message": "Report generation endpoint ready"}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# NEW: Bulk Email Dispatching
# ---------------------------------------------------------------------------
class BulkEmailView(APIView):
    """
    POST /api/send-bulk-email/

    Body:
        {
            "email_list": ["a@x.com", "b@y.com", ...],
            "subject":    "Hello",
            "message":    "Body text"
        }

    Queues a Celery task and returns 202 with task_id so the client can
    poll /api/task-status/<task_id>/ for the outcome.
    """

    # Max 500 recipients per request — dev SMTP quota bachane ke liye
    MAX_RECIPIENTS = 500

    def post(self, request):
        email_list = request.data.get("email_list")
        subject    = request.data.get("subject")
        message    = request.data.get("message")

        # ---- validation ------------------------------------------------
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

        # ---- enqueue ---------------------------------------------------
        task = send_bulk_emails_task.delay(email_list, subject, message)

        return Response(
            {
                "message":    "Bulk email task queued successfully",
                "task_id":    task.id,
                "recipients": len(email_list),
                "status_check_url": f"/api/task-status/{task.id}/",
            },
            status=status.HTTP_202_ACCEPTED,
        )