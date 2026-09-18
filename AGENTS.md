# AGENTS

Guia rapida de la estructura actual del proyecto Mesa247.

## Raiz

- `AGENTS.md`: este archivo. Mantiene el mapa del repo para no tener que inferir la arquitectura desde cero.
- `docker-compose.yml`: levanta el backend FastAPI y MySQL para pruebas locales.
- `.idea/`: configuracion local del IDE. No contiene codigo de la aplicacion.
- `.DS_Store`: metadatos de macOS. No es parte de la app.
- `mesa-api/`: backend FastAPI de la cola de espera.
- `mesa-queue/`: frontend Vite/React de la cola de espera.

## Docker local

El entorno local principal usa Docker Compose desde la raiz:

```bash
docker compose up -d --build
```

Servicios:

- `api`: backend FastAPI publicado en `http://localhost:8000`.
- `mysql`: MySQL 8.4 publicado en `localhost:3306`.

Credenciales de desarrollo:

- Base de datos: `mesa247`
- Usuario: `mesa_user`
- Password: `mesa_password`
- URL interna del contenedor API: `mysql+pymysql://mesa_user:mesa_password@mysql:3306/mesa247`

La inicializacion de MySQL monta:

- `mesa-api/database/schema.sql`
- `mesa-api/database/seeds/locations.sql`

Ambos SQL declaran `SET NAMES utf8mb4;` para evitar errores de encoding como `MediterrÃ¡nea`.

Nota local importante: el frontend apunta por defecto a `http://localhost:8000/api`. Si se usa `127.0.0.1:8000`, revisar que no haya otro proceso Python local ocupando ese puerto.

## `mesa-api/`

Backend FastAPI real y activo.

Archivos principales:

- `pyproject.toml`: dependencias del backend (`fastapi`, `uvicorn`, `sqlalchemy`, `pymysql`, pytest/httpx para dev).
- `Dockerfile`: imagen del backend para Compose.
- `.dockerignore`: evita copiar `.venv`, caches y artefactos locales a la imagen.
- `README.md`: instrucciones basicas de ejecucion local.
- `app/main.py`: crea la app FastAPI, configura CORS e incluye las rutas bajo `/api`.
- `app/core/config.py`: configuracion de la app, CORS y `DATABASE_URL`.
- `app/db/session.py`: engine SQLAlchemy y `SessionLocal`.
- `app/db/base.py`: base declarativa SQLAlchemy.
- `app/models/queue.py`: modelos `Location`, `Customer`, `QueueEntry` y `QueueStatus`.
- `app/api/routes.py`: endpoints de health, locations, queue y waitlist legacy en memoria.
- `app/schemas/waitlist.py`: esquemas Pydantic usados por la API.
- `database/schema.sql`: tablas MySQL.
- `database/seeds/locations.sql`: sedes iniciales.
- `tests/`: pruebas actuales del backend.

Endpoints actuales:

- `GET /api/health`
- `GET /api/locations`
- `POST /api/queue`
- `GET /api/queue/{queue_id}`
- `PATCH /api/queue/{queue_id}/cancel`
- `POST /api/waitlist`
- `GET /api/waitlist`
- `GET /api/waitlist/{entry_id}`

Comandos utiles:

```bash
cd mesa-api
.venv/bin/python -m pytest
```

Para ejecucion sin Docker:

```bash
cd mesa-api
source .venv/bin/activate
uvicorn app.main:app --reload
```

## `mesa-queue/`

Frontend Vite/React real y activo para probar el flujo de cola.

Archivos principales:

- `package.json`: scripts y dependencias del frontend.
- `vite.config.ts`: Vite con React, Tailwind y alias `@` hacia `src`.
- `src/main.tsx`: entrada React.
- `src/App.tsx`: configuracion principal de rutas/vistas.
- `src/index.css`: estilos globales y Tailwind.
- `src/lib/api.ts`: cliente HTTP del backend. Default: `http://localhost:8000/api`.
- `src/lib/session.ts`: helpers de sesion local del flujo de cola.
- `src/lib/utils.ts`: utilidades compartidas de UI.
- `src/routes/QueueLayout.tsx`: layout del flujo publico.
- `src/pages/JoinPage.tsx`: pantalla para unirse a la cola.
- `src/pages/QueuePage.tsx`: pantalla de estado del cliente en cola.
- `src/pages/LoginPage.tsx`: pantalla de login.
- `src/pages/HostWaitlistPage.tsx`: vista de gestion/anfitrion.
- `src/components/ui/`: componentes UI reutilizables.
- `src/assets/`: imagenes y recursos visuales.

Comandos utiles:

```bash
cd mesa-queue
npm run dev -- --host 127.0.0.1 --port 5174
npm run build
```

La app local se prueba en `http://127.0.0.1:5174/`. El backend permite CORS para `localhost` y `127.0.0.1` en los puertos `5173` y `5174`.
