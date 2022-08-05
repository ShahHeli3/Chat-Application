from rest_framework import serializers

from chat.models import Message


class GetAllMessagesSerializer(serializers.ModelSerializer):

    username = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    timestamp = serializers.SerializerMethodField()

    def get_username(self, obj):
        return obj.sender_user.username

    def get_full_name(self, obj):
        return obj.sender_user.full_name

    def get_timestamp(self, obj):
        return obj.timestamp.strftime('%B %-d, %Y %I:%M %p')

    class Meta:
        model = Message
        fields = ['room', 'message', 'timestamp', 'username', 'sender_user', 'full_name', 'message_type']
