from django.contrib.auth.views import LogoutView
from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.UserRegisterView.as_view(), name='register'),
    path('', views.UserLoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(template_name='users/logout.html'), name='logout'),
    path('profile/<int:pk>/', views.ProfileUpdateView.as_view(), name='profile'),
]
