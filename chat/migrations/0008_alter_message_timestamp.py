# Generated by Django 4.0.6 on 2022-08-05 06:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0007_imageshared'),
    ]

    operations = [
        migrations.AlterField(
            model_name='message',
            name='timestamp',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
