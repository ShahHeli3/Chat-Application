from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import render
from django.utils.crypto import get_random_string

from chat.models import Room, Message, PersonalRoom, Group, GroupMembers
from chat.serializer import GetAllMessagesSerializer
from users.models import CustomUser


def home(request):
    """
    function to load all users, the logged-in user's rooms and send it to frontend
    :return: rooms, users
    """
    users = CustomUser.objects.all()
    rooms = PersonalRoom.objects.filter(Q(sender_user=request.user) | Q(receiver_user=request.user))
    groups = GroupMembers.objects.filter(user=request.user)
    context = {'users': users, 'rooms': rooms, 'groups': groups}
    return render(request, 'chat/chat.html', context=context)


def get_users_ajax(request):
    """
    function to get all the users for suggestions while searching
    """
    get_users = list(CustomUser.objects.filter(is_active=True).values_list('username', flat=True))
    return JsonResponse(get_users, safe=False)


def get_all_groups_ajax(request):
    """
    function to get all the groups of logged-in user for suggestions while searching
    """
    get_groups = list(GroupMembers.objects.filter(user=request.user).values_list('group__group_name', flat=True))
    return JsonResponse(get_groups, safe=False)


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
    profile_image = str(message_receiver.profile_image)

    serializer = GetAllMessagesSerializer(Message.objects.filter(room=room).order_by('id'), many=True)

    context = {
        "json": serializer.data,
        "sender_user": sender_user,
        "sender_user_id": sender_user_id,
        "receiver_user": receiver_user,
        "receiver": receiver,
        "profile_image": profile_image
    }
    return JsonResponse(context)


def get_all_users_for_group_creation(request):
    """
    function to get all the users except for logged-in user for suggestions while group creation
    """
    current_user = request.user.id
    get_users = CustomUser.objects.exclude(id=current_user).values_list('username', flat=True)
    users_list = list(get_users)
    return JsonResponse(users_list, safe=False)


def create_group(request):
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
    create_room.save()
    room_name = create_room.room_name

    # create group
    create_group = Group.objects.create(room=create_room, group_name=group_name, group_icon=group_icon)
    create_group.save()
    request.session['group_id'] = create_group.id

    # add members
    sender_obj = request.user
    add_member = GroupMembers.objects.create(group=create_group, user=sender_obj)
    add_member.save()

    for member in group_members_list:
        new_member = CustomUser.objects.get(username=member)
        add_new_member = GroupMembers.objects.create(group=create_group, user=new_member)
        add_new_member.save()

    context = {
        'sender': sender_obj.full_name,
        'room_name': room_name
    }
    return JsonResponse(context)


def get_group_messages(request):
    """
    to get previous messages of the group
    """
    room_name = request.GET['room']
    room = Room.objects.get(room_name=room_name)
    sender_user_obj = request.user
    group_icon = str(Group.objects.get(room=room).group_icon)

    serializer = GetAllMessagesSerializer(Message.objects.filter(room=room).order_by('id'), many=True)

    context = {
        "json": serializer.data,
        "sender_user_id": sender_user_obj.id,
        "sender_user": sender_user_obj.full_name,
        "group_icon": group_icon,
    }
    return JsonResponse(context)


def get_room_from_group_name_ajax(request):
    """
    to get room name from the group name
    """
    group_name = request.GET['group']
    user_group = GroupMembers.objects.get(user=request.user, group__group_name=group_name)
    return JsonResponse({'room': user_group.group.room.room_name})


def change_group_name(request):
    """
    to update the group name
    """
    group_name = request.POST['old_name']
    new_name = request.POST['name']

    if new_name == group_name:
        return JsonResponse({'status': False})

    group = GroupMembers.objects.get(group__group_name=group_name, user=request.user).group_id
    Group.objects.filter(id=group).update(group_name=new_name)
    return JsonResponse({'status': True})


def update_group_icon(request):
    """
    to update the group icon
    """
    group_name = request.POST['group_name']
    icon = request.POST['image_url']
    group = GroupMembers.objects.get(group__group_name=group_name, user=request.user).group_id
    Group.objects.filter(id=group).update(group_icon=icon)
    return JsonResponse({'message': 'Group Icon Updated'})


def exit_group(request):
    """
    to leave the group
    """
    group_name = request.POST['group_name']
    group_member = GroupMembers.objects.get(group__group_name=group_name, user=request.user)
    group_room_id = group_member.group.room.id
    group_member.delete()
    return JsonResponse({'room': group_room_id})


def get_group_members(request):
    """
    to get existing group members
    """
    group_name = request.GET['group_name']
    group = GroupMembers.objects.get(group__group_name=group_name, user=request.user).group
    group_members = GroupMembers.objects.filter(group=group)
    group_members_list = [group_member.user.full_name for group_member in group_members]
    return JsonResponse(group_members_list, safe=False)


def get_users_except_group_members(request):
    """
    to get users other than group members for suggestions while adding members
    """
    group_name = request.GET['group_name']
    group = GroupMembers.objects.get(group__group_name=group_name, user=request.user).group
    group_members = list(GroupMembers.objects.filter(group=group).values_list('user__username', flat=True))
    users = list(CustomUser.objects.all().values_list('username', flat=True))
    available_users = [i for i in users if i not in group_members]

    return JsonResponse(available_users, safe=False)


def add_group_members(request):
    """
    to add group members
    """
    group_name = request.POST['group_name']
    group_members_list = request.POST.getlist('members[]')

    group = GroupMembers.objects.get(user=request.user, group__group_name=group_name).group

    members_list = []

    for member in group_members_list:
        user = CustomUser.objects.get(username=member)
        member_name = user.full_name
        members_list.append(member_name)
        GroupMembers.objects.create(group=group, user=user)

    return JsonResponse(members_list, safe=False)


def save_image_to_db(request):
    """
    to save the sent image to the database and return its path
    """
    print(request.POST)
    image_id = request.POST['image']
    print(f"https://res.cloudinary.com/dhhzjlge9/image/upload/v1659613975/{image_id}.jpg")
