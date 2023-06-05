web: gunicorn inexture_chat.wsgi
web: daphne inexture_chat.asgi:application --port $PORT --bind 0.0.0.0
worker: python manage.py runworker --settings=inexture_chat.settings -v2
