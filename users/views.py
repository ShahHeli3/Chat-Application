from django.contrib import auth, messages
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views import View
from django.views.generic import CreateView, UpdateView

from users.forms import NewUserRegister, ProfileUpdateForm
from users.models import CustomUser


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


class ProfileUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    form_class = ProfileUpdateForm
    model = CustomUser
    template_name = 'users/update_profile.html'
    success_url = reverse_lazy('chat')

    def test_func(self):
        user = self.get_object()
        if self.request.user.id == user.id:
            return True
        return False
