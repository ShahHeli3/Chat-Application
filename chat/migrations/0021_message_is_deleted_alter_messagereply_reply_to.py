# Generated by Django 4.0.6 on 2022-08-29 16:36

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0020_alter_messagereply_reply_to'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='messagereply',
            name='reply_to',
            field=models.ForeignKey(on_delete=django.db.models.deletion.DO_NOTHING, related_name='replied_to_message', to='chat.message'),
        ),
    ]
