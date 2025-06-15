Start production with attaching .env:

docker-compose -f docker-compose.prod.yml --env-file .env.prod build frontend
docker-compose -f docker-compose.prod.yml --env-file .env.prod up --build

docker-compose -f docker-compose.dev.yml --env-file .env build backend --no-cache