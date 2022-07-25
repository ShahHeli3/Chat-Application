from django.contrib.auth.models import AnonymousUser
from django.db import models
from django.db.models import SET

from users.models import CustomUser


class Room(models.Model):
    """
    model for chat rooms
    """
    sender_user = models.ForeignKey(CustomUser, related_name='room_sender', on_delete=SET(AnonymousUser.id))
    receiver_user = models.ForeignKey(CustomUser, related_name='room_receiver', on_delete=SET(AnonymousUser.id))
    room_name = models.CharField(max_length=200, unique=True)

    def __str__(self):
        return self.room_name


class Message(models.Model):
    """
    model for storing the messages of the chat
    """
    sender_user = models.ForeignKey(CustomUser, related_name='sender', on_delete=SET(AnonymousUser.id))
    room = models.ForeignKey(Room, related_name='message_room', on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.CharField(max_length=100)
