# Mesa247 API

Backend de Mesa247 construido con FastAPI, SQLAlchemy y MySQL. Expone los endpoints de sedes, cola de espera, autenticacion y gestion de anfitrion bajo el prefijo `/api`.

## Requisitos

- Docker y Docker Compose
- Puerto `8000` disponible para la API
- Puerto `3306` disponible si se quiere acceder a MySQL desde la maquina local

## Correr el backend en Docker

Desde la raiz del repositorio:

```bash
docker compose up -d --build mysql api
```

Esto levanta dos contenedores:

- `mesa247-mysql`: base de datos MySQL 8.4 con el esquema y las sedes iniciales.
- `mesa247-api`: API FastAPI disponible en `http://localhost:8000`.

Verifica que la API este respondiendo:

```bash
curl http://localhost:8000/api/health
```

Para ver logs del backend:

```bash
docker compose logs -f api
```

Para detener el backend y la base de datos:

```bash
docker compose stop api mysql
```

## Variables de entorno

El servicio `api` usa estas variables desde `docker-compose.yml`:

```bash
DATABASE_URL=mysql+pymysql://mesa_user:mesa_password@mysql:3306/mesa247
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
```

## Base de datos

El contenedor de MySQL inicializa la base de datos `mesa247` con:

- `database/schema.sql`
- `database/seeds/locations.sql`

Credenciales locales de desarrollo:

- Base de datos: `mesa247`
- Usuario: `mesa_user`
- Password: `mesa_password`
- Root password: `mesa_root_password`

## Crear operadores

Con los contenedores arriba, puedes crear un operador desde el contenedor de la API:

```bash
docker compose exec api create-operator
```

Tambien puedes hacerlo de forma no interactiva:

```bash
docker compose exec api create-operator --username anfitrion1 --location-id 1
```

## Correr pruebas

Si tienes el entorno local de Python instalado:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Endpoints principales

- `GET /api/health`
- `GET /api/locations`
- `POST /api/queue`
- `GET /api/queue/{queue_id}`
- `PATCH /api/queue/{queue_id}/cancel`
- `PATCH /api/queue/{queue_id}/accept`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `GET /api/host/queue`
