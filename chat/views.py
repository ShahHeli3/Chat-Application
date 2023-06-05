from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import render
from django.utils.crypto import get_random_string
from django.views import View
from rest_framework.response import Response

from chat.models import Room, Message, PersonalRoom, Group, GroupMembers, GroupMessage, DeletedMessage, MessageReply
from chat.serializer import GetAllMessagesSerializer, GetRepliedMessagesSerializer
from users.models import CustomUser


class HomeView(LoginRequiredMixin, View):
    def get(self, request):
        """
        function to load all users, the logged-in user's rooms and send it to frontend
        :return: rooms, users
        """
        users = CustomUser.objects.all()
        rooms = PersonalRoom.objects.filter(Q(sender_user=request.user) | Q(receiver_user=request.user))
        groups = GroupMembers.objects.filter(user=request.user)
        context = {'users': users, 'rooms': rooms, 'groups': groups}
        return render(request, 'chat/chat.html', context=context)


class GetCurrentUserView(View):
    """
    to get the logged-in user in js
    """

    def get(self, request):
        return JsonResponse({'user': request.user.id})


class GetAllUsersView(View):
    def get(self, request):
        """
        function to get all the users for suggestions while searching
        """
        get_users = list(CustomUser.objects.filter(is_active=True).values_list('username', flat=True))
        return JsonResponse(get_users, safe=False)


class GetAllGroupsView(View):
    def get(self, request):
        """
        function to get all the groups of logged-in user for suggestions while searching
        """
        get_groups = list(GroupMembers.objects.filter(user=request.user).values_list('group__group_name', flat=True))
        return JsonResponse(get_groups, safe=False)


class RoomsView(View):
    def post(self, request):
        """
        to get or create room for the sender and requested receiver
        """
        receiver = request.POST['receiver']

        users = CustomUser.objects.all()
        all_users = [user.username for user in users]

        # if user from the entered username does not exist
        if receiver not in all_users:
            return JsonResponse({'message': "No such user exists. Please enter a correct username"})

        sender_user_obj = request.user
        sender_user = sender_user_obj.username
        receiver_user_obj = CustomUser.objects.get(username=receiver)
        receiver_user = receiver_user_obj.username

        # check if the sender and receiver already have a room
        get_room = PersonalRoom.objects.filter(Q(sender_user=sender_user_obj, receiver_user=receiver_user_obj) |
                                               Q(sender_user=receiver_user_obj, receiver_user=sender_user_obj))

        # fetches the room name if a room already exists
        if get_room:
            room_name = get_room[0].room.room_name
            new_room = False

        # creates a new room if room does not exist
        else:
            new_room = get_random_string(10)

            while True:
                room_exists = Room.objects.filter(room_name=new_room)
                if room_exists:
                    new_room = get_random_string(10)
                else:
                    break
            create_room = Room.objects.create(room_name=new_room)
            PersonalRoom.objects.create(room=create_room, sender_user=sender_user_obj,
                                        receiver_user=receiver_user_obj)
            room_name = create_room.room_name
            new_room = True

        response = {
            'new_room': new_room,
            'sender_user': sender_user,
            'receiver_user': receiver_user,
            'receiver_name': receiver_user_obj.full_name,
            'receiver_profile': str(receiver_user_obj.profile_image),
            'room_name': room_name
        }
        return JsonResponse(response)


class GetAllMessagesView(View):
    def get(self, request):
        """
        to get all the previous messages of the room
        """

        room_name = request.GET['room']

        try:
            room = Room.objects.get(room_name=room_name)
        except Exception:
            return JsonResponse({'status': 'Room not found'})

        try:
            room_obj = PersonalRoom.objects.get(room=room)
        except Exception:
            return JsonResponse({'status': 'Personal Room not found'})

        unseen_messages = Message.objects.filter(room=room, status='unseen').exclude(sender_user=request.user)
        unseen_messages_list = [i.id for i in unseen_messages]
        unseen_messages.update(status='seen')

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{room.room_name}',
            {
                'type': 'refresh_message_status',
                'unseen_messages': unseen_messages_list,
            }
        )

        if room_obj.receiver_user == request.user:
            sender = room_obj.receiver_user
            message_receiver = room_obj.sender_user
        else:
            sender = room_obj.sender_user
            message_receiver = room_obj.receiver_user

        sender_user_id = sender.id
        sender_user = sender.full_name

        receiver_user = message_receiver.username
        receiver = message_receiver.full_name
        profile_image = str(message_receiver.profile_image)

        deleted_messages = list(DeletedMessage.objects.filter(user=request.user).values_list('message', flat=True))

        serializer = GetAllMessagesSerializer(
            Message.objects.filter(room=room, is_deleted=False).exclude(id__in=deleted_messages).
            order_by('id'), many=True)

        message_reply_dict = {}
        for message_reply in MessageReply.objects.filter(message__room=room):
            message_reply_dict[message_reply.message.id] = {'reply_to_message': message_reply.reply_to.message,
                                                            'reply_to_sender': message_reply.reply_to.sender_user.full_name,
                                                            'reply_to': message_reply.reply_to.id,
                                                            'reply_to_message_type': message_reply.reply_to.message_type}

        context = {
            "replied_messages": message_reply_dict,
            "json": serializer.data,
            "sender_user": sender_user,
            "sender_user_id": sender_user_id,
            "receiver_user": receiver_user,
            "receiver": receiver,
            "profile_image": profile_image
        }
        return JsonResponse(context)


class GetUsersForGroupView(View):
    def get(self, request):
        """
        function to get all the users except for logged-in user for suggestions while group creation
        """
        current_user = request.user.id
        get_users = CustomUser.objects.exclude(id=current_user).values_list('username', flat=True)
        users_list = list(get_users)
        return JsonResponse(users_list, safe=False)


class CreateGroupView(View):
    def post(self, request):
        """
        to create group
        """
        group_name = request.POST['group_name']
        group_icon = request.POST['group_icon']
        group_members_list = request.POST.getlist('group_members[]')

        # if user has not selected any group icon then set default
        if not group_icon:
            group_icon = 'https://res.cloudinary.com/dhhzjlge9/image/upload/v1659526713/group/blij1remmmq0i33fnirp.png'

        group_room = get_random_string(10)

        while True:
            room_exists = Room.objects.filter(room_name=group_room)
            if room_exists:
                group_room = get_random_string(10)
            else:
                break

        # create room
        create_room = Room.objects.create(room_name=group_room)
        room_name = create_room.room_name

        # create group
        create_group = Group.objects.create(room=create_room, group_name=group_name, group_icon=group_icon)

        # add members
        sender_obj = request.user
        GroupMembers.objects.create(group=create_group, user=sender_obj)

        for member in group_members_list:
            new_member = CustomUser.objects.get(username=member)
            GroupMembers.objects.create(group=create_group, user=new_member)

        context = {
            'sender': sender_obj.full_name,
            'room_name': room_name,
            'room_id': create_room.id,
            'group_icon': group_icon
        }
        return JsonResponse(context)


class GetGroupMessagesView(View):
    def get(self, request):
        """
        to get previous messages of the group
        """
        room_name = request.GET['room']
        room = Room.objects.get(room_name=room_name)
        sender_user_obj = request.user
        group_icon = str(Group.objects.get(room=room).group_icon)

        room_messages = list(Message.objects.filter(room=room, status='unseen').values_list('id', flat=True))
        updated_messages = []
        message_status = []

        for message in room_messages:
            unseen_message = GroupMessage.objects.filter(receiver_user=request.user, message=message, status='unseen')

            if unseen_message:
                unseen_message.update(status='seen')
                message_status = list(GroupMessage.objects.filter(message=message).values_list('status', flat=True))

            if message_status and 'unseen' not in message_status:
                update_message = Message.objects.filter(id=message)
                update_message.update(status='seen')
                updated_messages.append(update_message[0].id)

        if updated_messages:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'chat_{room_name}',
                {
                    'type': 'refresh_message_status',
                    'unseen_messages': updated_messages,
                }
            )

        deleted_messages = list(DeletedMessage.objects.filter(user=request.user).values_list('message', flat=True))

        serializer = GetAllMessagesSerializer(
            Message.objects.filter(room=room, is_deleted=False).exclude(id__in=deleted_messages).
            order_by('id'), many=True)

        message_reply_dict = {}
        for message_reply in MessageReply.objects.filter(message__room=room):
            message_reply_dict[message_reply.message.id] = {'reply_to_message': message_reply.reply_to.message,
                                                            'reply_to_sender': message_reply.reply_to.sender_user.full_name,
                                                            'reply_to': message_reply.reply_to.id,
                                                            'reply_to_message_type': message_reply.reply_to.message_type}

        context = {
            "replied_messages": message_reply_dict,
            "json": serializer.data,
            "sender_user_id": sender_user_obj.id,
            "sender_user": sender_user_obj.full_name,
            "group_icon": group_icon,
        }
        return JsonResponse(context)


class GetRoomNameView(View):
    def get(self, request):
        """
        to get room name from the group name
        """
        group_name = request.GET['group']

        try:
            user_group = GroupMembers.objects.get(user=request.user, group__group_name=group_name)
        except Exception:
            return JsonResponse({'status': 'Group not found'})

        return JsonResponse({'room': user_group.group.room.room_name})


class ChangeGroupNameView(View):
    def post(self, request):
        """
        to update the group name
        """
        room_name = request.POST['room']
        new_name = request.POST['name']

        try:
            room_obj = Room.objects.get(room_name=room_name)
        except Exception:
            return JsonResponse({'status': 'Room not found'})

        try:
            group_obj = Group.objects.get(room=room_obj)
        except Exception:
            return JsonResponse({'status': 'Group not found'})

        if new_name == group_obj.group_name:
            return JsonResponse({'status': False})

        Group.objects.filter(id=group_obj.id).update(group_name=new_name)
        return JsonResponse({'status': True})


class UpdateGroupIconView(View):
    def post(self, request):
        """
        to update the group icon
        """
        room_name = request.POST['room']
        icon = request.POST['image_url']

        try:
            room_obj = Room.objects.get(room_name=room_name)
        except Exception:
            return JsonResponse({'status': 'Room not found'})

        try:
            group_obj = Group.objects.get(room=room_obj)
        except Exception:
            return JsonResponse({'status': 'Group not found'})

        Group.objects.filter(id=group_obj.id).update(group_icon=icon)
        return JsonResponse({'message': 'Group Icon Updated'})


class ExitGroupView(View):
    def post(self, request):
        """
        to leave the group
        """
        room_name = request.POST['room']

        try:
            room_obj = Room.objects.get(room_name=room_name)
        except Exception:
            return JsonResponse({'status': 'Room not found'})

        try:
            group_obj = Group.objects.get(room=room_obj)
        except Exception:
            return JsonResponse({'status': 'Group not found'})

        try:
            group_member = GroupMembers.objects.get(group=group_obj, user=request.user)
        except Exception:
            return JsonResponse({'status': 'Group Member not found'})

        group_member.delete()
        return JsonResponse({'room': room_obj.id})


class GetGroupMembersView(View):
    def get(self, request):
        """
        to get existing group members
        """
        room_name = request.GET['room']

        try:
            room_obj = Room.objects.get(room_name=room_name)
        except Exception:
            return JsonResponse({'status': 'Room not found'})

        try:
            group_obj = Group.objects.get(room=room_obj)
        except Exception:
            return JsonResponse({'status': 'Group not found'})

        group_members = GroupMembers.objects.filter(group=group_obj)
        group_members_list = [group_member.user.full_name for group_member in group_members]
        return JsonResponse(group_members_list, safe=False)


class GetUsersExceptGroupMembersView(View):
    def get(self, request):
        """
        to get users other than group members for suggestions while adding members
        """
        room_name = request.GET['room']

        try:
            room_obj = Room.objects.get(room_name=room_name)
        except Exception:
            return JsonResponse({'status': 'Room not found'})

        try:
            group_obj = Group.objects.get(room=room_obj)
        except Exception:
            return JsonResponse({'status': 'Group not found'})

        group_members = list(GroupMembers.objects.filter(group=group_obj).values_list('user__username', flat=True))
        users = list(CustomUser.objects.all().values_list('username', flat=True))

        available_users = [i for i in users if i not in group_members]

        return JsonResponse(available_users, safe=False)


class AddGroupMembersView(View):
    def post(self, request):
        """
        to add group members
        """
        room_name = request.POST['room']
        group_members_list = request.POST.getlist('members[]')

        try:
            room_obj = Room.objects.get(room_name=room_name)
        except Exception:
            return JsonResponse({'status': 'Room not found'})

        try:
            group_obj = Group.objects.get(room=room_obj)
        except Exception:
            return JsonResponse({'status': 'Group not found'})

        members_list = []

        for member in group_members_list:
            try:
                user = CustomUser.objects.get(username=member)
            except Exception:
                return JsonResponse({'status': 'User not found'})

            member_name = user.full_name
            members_list.append(member_name)
            GroupMembers.objects.create(group=group_obj, user=user)

        return JsonResponse(members_list, safe=False)


class UpdateMessageStatusView(View):
    def post(self, request):
        """
        to update the message status
        """
        message_id = request.POST['message_id']
        Message.objects.filter(id=message_id).update(status='seen')

        try:
            message_obj = Message.objects.get(id=message_id)
        except Exception:
            return JsonResponse({'status': 'Message not found'})

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{message_obj.room.room_name}',
            {
                'type': 'update_message_status',
                'message_id': message_id,
            }
        )

        return JsonResponse({'message': 'ok'})


class GetRoomType(View):

    def get(self, request):
        """
        to get the room name and return whether it is a personal or a group room
        """
        room_name = request.GET['room_name']

        try:
            room_obj = Room.objects.get(room_name=room_name)
        except Exception:
            return JsonResponse({'status': 'Room not found'})

        if PersonalRoom.objects.filter(room=room_obj):
            return JsonResponse({'room_type': 'Personal', 'room_id': room_obj.id})

        return JsonResponse({'room_type': 'Group', 'room_id': room_obj.id})


class UpdateGroupMessageStatusView(View):
    def post(self, request):
        """
        to update the status of message sent in group
        """
        message_id = request.POST['message_id']

        GroupMessage.objects.filter(receiver_user=request.user, message=message_id).update(status='seen')
        message_status = list(GroupMessage.objects.filter(message=message_id).values_list('status', flat=True))

        if 'unseen' not in message_status:
            Message.objects.filter(id=message_id).update(status='seen')

            try:
                message_obj = Message.objects.get(id=message_id)
            except Exception:
                return JsonResponse({'status': 'Message not found'})

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'chat_{message_obj.room.room_name}',
                {
                    'type': 'update_group_message_status',
                    'message_id': message_id,
                }
            )

        return JsonResponse({'message': 'ok'})


class GetMessageInfoView(View):

    def get(self, request):
        """
        to get the status information about a specific message
        """
        message_id = request.GET['message_id']

        seen_by = list(GroupMessage.objects.filter(message=message_id, status='seen').
                       values_list('receiver_user', flat=True))

        users_list = []
        for user_id in seen_by:
            try:
                user = CustomUser.objects.get(id=user_id).full_name
            except Exception:
                return JsonResponse({'status': 'User not found'})

            users_list.append(user)

        return JsonResponse(users_list, safe=False)


class DeleteMessageForUserView(View):
    def post(self, request):
        """
        to delete selected message for the logged in user
        """
        message_id = request.POST['message_id']

        try:
            message_obj = Message.objects.get(id=message_id)
        except Exception:
            return JsonResponse({'status': 'Message not found'})

        DeletedMessage.objects.create(message=message_obj, user=request.user)
        return JsonResponse({'status': 'message deleted for current user'})


class DeleteMessageForEveryoneView(View):
    def post(self, request):
        message_id = request.POST['message_id']
        room_name = request.POST['room_name']

        message_obj = Message.objects.filter(id=message_id)
        message_obj.update(is_deleted=True)

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{room_name}',
            {
                'type': 'delete_message',
                'message_id': message_id,
            }
        )

        return JsonResponse({'status': 'message deleted successfully'})


class GetRepliedToMessageInfoView(View):
    def get(self, request):
        """
        to get the message type by its id         
        """
        message_id = request.GET['message_id']

        try:
            message_obj = Message.objects.get(id=message_id)
        except Exception:
            return JsonResponse({'status': 'Message not found'})

        message_type = message_obj.message_type
        message_data = message_obj.message
        message_sender = message_obj.sender_user.full_name

        return JsonResponse({
            'message_type': message_type,
            'message_data': message_data,
            'message_sender': message_sender
        })
