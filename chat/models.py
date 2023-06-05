from cloudinary.models import CloudinaryField

from users.models import CustomUser

from django.contrib.auth.models import User, AnonymousUser
from django.db import models
from django.db.models import SET


class Room(models.Model):
    """
    model for chat rooms
    """
    room_name = models.CharField(max_length=200, unique=True)

    def __str__(self):
        return self.room_name


class PersonalRoom(models.Model):
    """
    model for storing chat rooms for 2 users
    """
    room = models.ForeignKey(Room, related_name='chat_room', on_delete=models.CASCADE)
    sender_user = models.ForeignKey(CustomUser, related_name='room_sender', on_delete=SET(AnonymousUser.id))
    receiver_user = models.ForeignKey(CustomUser, related_name='room_receiver', on_delete=SET(AnonymousUser.id))


class Group(models.Model):
    """
    models for storing group name with its corresponding room
    """
    room = models.ForeignKey(Room, related_name='room', on_delete=models.CASCADE)
    group_name = models.CharField(max_length=25, blank=False, null=False)
    group_icon = CloudinaryField('image', folder='group_icons', default='')

    def __str__(self):
        return self.group_name


class GroupMembers(models.Model):
    """
    model for storing group members
    """
    user = models.ForeignKey(CustomUser, related_name='group_member', on_delete=models.CASCADE)
    group = models.ForeignKey(Group, related_name='group_room', on_delete=models.CASCADE)


class Message(models.Model):
    """
    model for storing the messages of the chat
    """
    sender_user = models.ForeignKey(CustomUser, related_name='sender', on_delete=SET(AnonymousUser.id))
    room = models.ForeignKey(Room, related_name='message_room', on_delete=models.CASCADE)
    message = models.TextField()
    message_type = models.CharField(max_length=100, default='text')
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, default='unseen')
    is_deleted = models.BooleanField(default=False)


class GroupMessage(models.Model):
    """
    model for storing group message status
    """
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    receiver_user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, default='unseen')


class DeletedMessage(models.Model):
    """
    model for storing deleted messages for users
    """
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    
    
class MessageReply(models.Model):
    """
    model for storing replied messages 
    """
    message = models.ForeignKey(Message, related_name='replied_message', on_delete=models.CASCADE)
    reply_to = models.ForeignKey(Message, related_name='replied_to_message', on_delete=models.DO_NOTHING)
