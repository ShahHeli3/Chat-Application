from django.urls import path
from . import views

urlpatterns = [
    path('chat', views.home, name='chat'),
    path('get_all_users', views.get_users_ajax, name='get_all_users'),
    path('get_or_create_room', views.get_or_create_room, name='get_or_create_room'),
    path('get_messages', views.get_messages, name='get_messages'),
    path('get_all_users_for_group_creation', views.get_all_users_for_group_creation, name='get_all_users_for_group_creation'),
    path('create_group', views.create_group, name='create_group'),
    path('get_group_messages', views.get_group_messages, name='get_group_messages'),
]
