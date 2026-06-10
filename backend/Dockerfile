FROM python:3.13

WORKDIR /app

RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config

RUN pip install pipenv

COPY Pipfile Pipfile.lock ./

RUN pipenv install --system --deploy

COPY . .

COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

CMD ["sh", "/app/entrypoint.sh"]

# FROM python:3.13

# WORKDIR /app

# RUN apt-get update && apt-get install -y \
#     default-libmysqlclient-dev \
#     build-essential \
#     pkg-config

# RUN pip install pipenv

# COPY Pipfile Pipfile.lock ./

# RUN pipenv install --system --deploy

# COPY . .

# EXPOSE 8000

# CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]