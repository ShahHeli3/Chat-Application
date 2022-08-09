from django.urls import path
from .views import HomeView, GetAllUsersView, GetAllGroupsView, RoomsView, GetAllMessagesView, GetUsersForGroupView, \
    CreateGroupView, GetGroupMessagesView, GetRoomNameView, ChangeGroupNameView, UpdateGroupIconView, ExitGroupView, \
    GetGroupMembersView, GetUsersExceptGroupMembersView, AddGroupMembersView

urlpatterns = [
    path('chat', HomeView.as_view(), name='chat'),
    path('get_all_users', GetAllUsersView.as_view(), name='get_all_users'),
    path('get_all_groups', GetAllGroupsView.as_view(), name='get_all_groups'),
    path('get_or_create_room', RoomsView.as_view(), name='get_or_create_room'),
    path('get_messages', GetAllMessagesView.as_view(), name='get_messages'),
    path('get_all_users_for_group_creation', GetUsersForGroupView.as_view(), name='get_all_users_for_group_creation'),
    path('create_group', CreateGroupView.as_view(), name='create_group'),
    path('get_group_messages', GetGroupMessagesView.as_view(), name='get_group_messages'),
    path('get_room_from_group_name', GetRoomNameView.as_view(), name='get_room_from_group_name'),
    path('change_group_name', ChangeGroupNameView.as_view(), name='change_group_name'),
    path('update_group_icon', UpdateGroupIconView.as_view(), name='update_group_icon'),
    path('exit_group', ExitGroupView.as_view(), name='exit_group'),
    path('get_group_members', GetGroupMembersView.as_view(), name='get_group_members'),
    path('get_users_except_group_members', GetUsersExceptGroupMembersView.as_view(),
         name='get_users_except_group_members'),
    path('add_group_members', AddGroupMembersView.as_view(), name='add_group_members'),

]
