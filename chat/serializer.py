from rest_framework import serializers

from chat.models import Message, MessageReply


class GetAllMessagesSerializer(serializers.ModelSerializer):
    """
    serializer to get all the messages and its data
    """

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
        fields = ['id', 'room', 'message', 'timestamp', 'username', 'sender_user', 'full_name', 'message_type', 'status']


class GetRepliedMessagesSerializer(serializers.ModelSerializer):
    """
    serializer to get replied messages and its data
    """
    reply_to_message = serializers.SerializerMethodField()
    reply_to_sender_user = serializers.SerializerMethodField()

    def get_reply_to_message(self, obj):
        return obj.reply_to.message

    def get_reply_to_sender_user(self, obj):
        return obj.reply_to.sender_user.full_name

    class Meta:
        model = MessageReply
        fields = ['message', 'reply_to', 'reply_to_message', 'reply_to_sender_user']


