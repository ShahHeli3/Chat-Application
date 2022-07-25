from django.urls import path
from . import views

urlpatterns = [
    path('chat', views.home, name='chat'),
    path('get_all_users', views.get_users_ajax, name='get_all_users'),
    path('get_or_create_room', views.get_or_create_room, name='get_or_create_room'),
    path('get_messages', views.get_messages, name='get_messages')
]
