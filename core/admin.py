from django.contrib import admin
from django.utils import timezone
from .models import User, Sender


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'is_premium', 'is_staff', 'is_active')
    list_filter = ('is_premium', 'is_staff', 'is_active')
    search_fields = ('username', 'email')


@admin.register(Sender)
class SenderAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'email', 'status', 'added_by', 'created_at')
    list_filter = ('status', 'created_at', 'use_ssl')
    search_fields = ('display_name', 'email', 'smtp_username')
    readonly_fields = ('created_at', 'updated_at', 'approved_at', 'approved_by')

    fieldsets = (
        ('Ownership', {
            'fields': ('added_by', 'status')
        }),
        ('Display', {
            'fields': ('display_name', 'email')
        }),
        ('SMTP Configuration', {
            'fields': ('smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'use_ssl', 'use_tls'),
            'classes': ('collapse',),
        }),
        ('Approval', {
            'fields': ('approved_by', 'approved_at', 'rejection_reason')
        }),
        ('Meta', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    actions = ['approve_senders', 'reject_senders']

    @admin.action(description='✅ Approve selected senders')
    def approve_senders(self, request, queryset):
        updated = queryset.update(
            status='approved',
            approved_by=request.user,
            approved_at=timezone.now(),
        )
        self.message_user(request, f'{updated} sender(s) approved.')

    @admin.action(description='❌ Reject selected senders')
    def reject_senders(self, request, queryset):
        updated = queryset.update(
            status='rejected',
            approved_by=request.user,
            approved_at=timezone.now(),
        )
        self.message_user(request, f'{updated} sender(s) rejected.')