from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Sender

User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class SenderSerializer(serializers.ModelSerializer):
    """Read-only serializer for listing senders (password NOT exposed)."""
    
    added_by_email = serializers.EmailField(source='added_by.email', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)
    
    class Meta:
        model = Sender
        fields = [
            'id', 'display_name', 'email',
            'smtp_host', 'smtp_port', 'smtp_username',
            'use_ssl', 'use_tls',
            'status',
            'added_by', 'added_by_email',
            'approved_by', 'approved_by_email',
            'approved_at', 'rejection_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'added_by', 'approved_by', 'approved_at',
            'rejection_reason', 'created_at', 'updated_at',
        ]


class SenderCreateSerializer(serializers.ModelSerializer):
    """Write-only serializer for creating a new sender."""
    
    smtp_password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = Sender
        fields = [
            'display_name', 'email',
            'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
            'use_ssl', 'use_tls',
        ]

    def create(self, validated_data):
        return Sender.objects.create(**validated_data)