from django.urls import path
from . import views

urlpatterns = [
    path('chat', views.home, name='chat'),
    path('get_all_users', views.get_users_ajax, name='get_all_users'),
    path('get_all_groups', views.get_all_groups_ajax, name='get_all_groups'),
    path('get_or_create_room', views.get_or_create_room, name='get_or_create_room'),
    path('get_messages', views.get_messages, name='get_messages'),
    path('get_all_users_for_group_creation', views.get_all_users_for_group_creation, name='get_all_users_for_group_creation'),
    path('create_group', views.create_group, name='create_group'),
    path('get_group_messages', views.get_group_messages, name='get_group_messages'),
    path('get_room_from_group_name', views.get_room_from_group_name_ajax, name='get_room_from_group_name'),
    path('change_group_name', views.change_group_name, name='change_group_name'),
    path('update_group_icon', views.update_group_icon, name='update_group_icon'),
    path('exit_group', views.exit_group, name='exit_group'),
    path('get_group_members', views.get_group_members, name='get_group_members'),
    path('get_users_except_group_members', views.get_users_except_group_members, name='get_users_except_group_members'),
    path('add_group_members', views.add_group_members, name='add_group_members'),

]
