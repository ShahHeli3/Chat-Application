from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import render
from django.utils.crypto import get_random_string

from chat.models import Room, Message, PersonalRoom
from chat.serializer import GetAllMessagesSerializer
from users.models import CustomUser


def home(request):
    users = CustomUser.objects.all()
    rooms = PersonalRoom.objects.filter(Q(sender_user=request.user) | Q(receiver_user=request.user))
    context = {'users': users, 'rooms': rooms}
    return render(request, 'chat/chat.html', context=context)


def get_users_ajax(request):
    """
    function to get all the users for suggesstions while searching
    """
    get_users = CustomUser.objects.filter(is_active=True).values_list('username', flat=True)
    users_list = list(get_users)
    return JsonResponse(users_list, safe=False)


def get_or_create_room(request):
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
        create_room.save()
        create_personal_room = PersonalRoom.objects.create(room=create_room, sender_user=sender_user_obj,
                                                           receiver_user=receiver_user_obj)
        create_personal_room.save()
        room_name = create_room.room_name

    response = {
        'sender_user': sender_user,
        'receiver_user': receiver_user,
        'room_name': room_name
    }
    return JsonResponse(response)


def get_messages(request):
    """
    to get all the previous messages of the room
    """
    room_name = request.GET['room']
    room = Room.objects.get(room_name=room_name)
    room_obj = PersonalRoom.objects.get(room=room)

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

    serializer = GetAllMessagesSerializer(Message.objects.filter(room=room).order_by('id'), many=True)

    context = {
        "json": serializer.data,
        "sender_user": sender_user,
        "sender_user_id": sender_user_id,
        "receiver_user": receiver_user,
        "receiver": receiver
    }
    return JsonResponse(context)
