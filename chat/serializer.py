from rest_framework import serializers

from chat.models import Message


class GetAllMessagesSerializer(serializers.ModelSerializer):

    username = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    def get_username(self, obj):
        return obj.sender_user.username

    def get_full_name(self, obj):
        return obj.sender_user.full_name

    class Meta:
        model = Message
        fields = ['room', 'message', 'timestamp', 'username', 'sender_user', 'full_name']
