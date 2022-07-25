from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    profile_image = models.ImageField(default='default.jpg', upload_to='profile_pics/')

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
