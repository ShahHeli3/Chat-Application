from django.contrib.auth.models import AbstractUser
from cloudinary.models import CloudinaryField


class CustomUser(AbstractUser):
    profile_image = CloudinaryField('image', folder='profiles')

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
