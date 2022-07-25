from django.contrib.auth.forms import UserCreationForm
from django import forms

from .models import CustomUser


class NewUserRegister(UserCreationForm):
    email = forms.EmailField()
    first_name = forms.CharField(max_length=50)
    last_name = forms.CharField(max_length=50)

    class Meta:
        model = CustomUser
        fields = ('username', 'first_name', 'last_name', 'email', 'password1', 'password2', 'profile_image')
