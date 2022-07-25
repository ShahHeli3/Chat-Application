from django.contrib import auth, messages
from django.contrib.messages.views import SuccessMessageMixin
from django.shortcuts import render, redirect
from django.views import View
from django.views.generic import CreateView

from users.forms import NewUserRegister


class UserRegisterView(SuccessMessageMixin, CreateView):
    form_class = NewUserRegister
    template_name = 'users/register.html'
    success_url = '/'
    success_message = "Your account has been successfully created! You can now login."


class UserLoginView(View):
    def get(self, request):
        return render(request, 'users/login.html')

    def post(self, request):
        username = request.POST.get('username')
        password = request.POST.get('password')

        user = auth.authenticate(username=username, password=password)

        if user:
            auth.login(request, user)
            return redirect('chat')
        else:
            messages.warning(request, "Invalid username or password!")
            return redirect('login')
