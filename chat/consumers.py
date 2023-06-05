import json
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.db.models import Q

from chat.models import Room, Message, Group, GroupMembers, GroupMessage, PersonalRoom, MessageReply
from users.models import CustomUser


class ChatConsumer(WebsocketConsumer):
    """
    consumer class for chat
    """

    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.message_id = None

    def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )
        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name,
            self.channel_name
        )

    # save message in the database
    def save_message(self, message, sender_user_id, message_type, reply_to):
        replied_msg = None
        sender_user = CustomUser.objects.get(id=sender_user_id)
        room = Room.objects.get(room_name=self.room_name)

        new_message = Message.objects.create(sender_user=sender_user, room=room, message=message,
                                             message_type=message_type)
        self.message_id = new_message.id

        if reply_to != 0:
            reply_to_msg = Message.objects.get(id=reply_to)
            replied_msg_obj = MessageReply.objects.create(reply_to=reply_to_msg, message=new_message)
            replied_msg = replied_msg_obj.reply_to

        group = Group.objects.filter(room=room).first()

        if group:
            group_members = list(GroupMembers.objects.filter(group=group).exclude(user=sender_user)
                                 .values_list('user', flat=True))
            for member in group_members:
                group_member = CustomUser.objects.get(id=member)
                GroupMessage.objects.create(message=new_message, receiver_user=group_member)

        return replied_msg

    # Receive message from WebSocket
    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        sender_user = text_data_json['sender_user']
        sender_user_id = text_data_json['sender_user_id']
        message_type = text_data_json['message_type']
        reply_to = text_data_json['reply_to']
        replied_msg = self.save_message(message, sender_user_id, message_type, reply_to)

        data_dict = {
            'type': 'chat_message',
            'message': message,
            'sender_user': sender_user,
            'message_type': message_type,
            'sender_user_id': sender_user_id,
            'message_id': self.message_id,
            'room_name': self.room_name,
            'is_reply_message': False
        }

        if replied_msg:
            data_dict['replied_msg'] = replied_msg.message
            data_dict['replied_to_msg_id'] = reply_to
            data_dict['replied_to_msg_type'] = Message.objects.get(id=reply_to).message_type
            data_dict['replied_msg_sender'] = replied_msg.sender_user.full_name
            data_dict['is_reply_message'] = True

        # Send message to room group
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            data_dict
        )

    # Receive message from room group
    def chat_message(self, event):
        message = event['message']
        sender_user = event['sender_user']
        message_type = event['message_type']
        sender_user_id = event['sender_user_id']
        message_id = event['message_id']
        room_name = event['room_name']

        json_dump_data_dict = {
            'message': message,
            'sender_user': sender_user,
            'message_type': message_type,
            'sender_user_id': sender_user_id,
            'message_id': message_id,
            'room_name': room_name,
            'replied_msg': None,
            'replied_msg_sender': None
        }

        if event['is_reply_message']:
            replied_msg = event['replied_msg']
            replied_msg_sender = event['replied_msg_sender']
            replied_to_msg_id = event['replied_to_msg_id']
            replied_to_msg_type = event['replied_to_msg_type']

            json_dump_data_dict['replied_msg'] = replied_msg
            json_dump_data_dict['replied_msg_sender'] = replied_msg_sender
            json_dump_data_dict['replied_to_msg_id'] = replied_to_msg_id
            json_dump_data_dict['replied_to_msg_type'] = replied_to_msg_type

        # Send message to WebSocket
        self.send(text_data=json.dumps(json_dump_data_dict))

    def update_message_status(self, value):
        updated_message_id = value['message_id']

        self.send(text_data=json.dumps({
            'updated_message_id': updated_message_id,
        }))

    def refresh_message_status(self, data):
        unseen_messages = data['unseen_messages']

        self.send(text_data=json.dumps({
            'unseen_messages': unseen_messages,
        }))

    def update_group_message_status(self, value):
        updated_message_id = value['message_id']

        self.send(text_data=json.dumps({
            'updated_message_id': updated_message_id,
        }))

    def unseen_messages_notifications(self, data):
        notifications = data['notifications']

        self.send(text_data=json.dumps({
            'notifications': notifications,
        }))

    def delete_message(self, data):
        message_div = f"message-{data['message_id']}"

        self.send(text_data=json.dumps({
            'deleted_message': message_div,
        }))


class NotificationConsumer(WebsocketConsumer):
    """
    consumer class for notifications
    """

    def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['username']
        self.room_group_name = f'notification_user_{self.room_name}'

        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )
        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name,
            self.channel_name
        )

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        user = text_data_json['user']
        room = text_data_json['room']
        room_type = text_data_json['room_type']
        user_list = [user]

        if room_type == 'Personal':
            room_obj = PersonalRoom.objects.get(room__room_name=room)
            if room_obj.receiver_user.id == user:
                user_list.append(room_obj.sender_user.id)
            else:
                user_list.append(room_obj.receiver_user.id)
        elif room_type == 'Group':
            group_members = list(GroupMembers.objects.filter(group__room__room_name=room).exclude(user=user).
                                 values_list('user', flat=True))
            user_list += list(group_members)

        for user in user_list:
            # Send notifications to user
            async_to_sync(self.channel_layer.group_send)(
                f'notification_user_{user}',
                {
                    'type': 'send_notifications',
                    'user': user,
                }
            )

    def send_notifications(self, data):
        user = data['user']

        personal_rooms = list(PersonalRoom.objects.filter(Q(sender_user=user) | Q(receiver_user=user)).
                              values_list('room', flat=True))
        group_rooms = list(GroupMembers.objects.filter(user=user).values_list('group__room', flat=True))
        users_rooms = personal_rooms + group_rooms

        unseen_messages_list = []

        for room in users_rooms:
            unseen_messages = list(Message.objects.filter(room=room, status='unseen').exclude(sender_user=user).
                                   values_list('id', flat=True))
            if unseen_messages:
                if room in group_rooms:
                    unseen_messages_count = 0
                    for message in unseen_messages:
                        if GroupMessage.objects.filter(message=message, receiver_user=user, status='unseen'):
                            unseen_messages_count += 1

                    if unseen_messages_count > 0:
                        unseen_messages_list.append([f"room-{room}", unseen_messages_count])
                else:
                    unseen_messages_list.append([f"room-{room}", len(unseen_messages)])

        self.send(text_data=json.dumps({
            'notifications': unseen_messages_list,
        }))
