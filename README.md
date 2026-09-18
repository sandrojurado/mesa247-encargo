# Mesa247 Encargo

Este repositorio contiene la aplicacion Mesa247, compuesta por un backend FastAPI y un frontend Vite/React para gestionar una cola de espera.

## Carpetas principales

- `mesa-api/`: backend FastAPI de la aplicacion. Incluye modelos, rutas, esquemas, configuracion de base de datos, scripts SQL y pruebas.
- `mesa-queue/`: frontend Vite/React de la cola de espera. Incluye paginas, componentes UI, cliente HTTP, helpers de sesion y recursos visuales.

## Carpetas de soporte local

- `.idea/`: configuracion local del IDE.
- `.git/`: metadatos internos de Git.

## Carpetas generadas o de entorno

Estas carpetas pueden aparecer durante el desarrollo local y no forman parte directa del codigo fuente principal:

- `mesa-api/.venv/`: entorno virtual local de Python.
- `mesa-api/.pytest_cache/`: cache de pruebas de pytest.
- `mesa-api/mesa_api.egg-info/`: metadatos generados del paquete Python.
- `mesa-queue/node_modules/`: dependencias instaladas del frontend.
- `mesa-queue/dist/`: build generado del frontend.

## Ejecucion local

El entorno local principal se levanta desde la raiz con Docker Compose:

```bash
docker compose up -d --build
```

Servicios:

- API: `http://localhost:8000`
- Frontend: se ejecuta desde `mesa-queue/` con `npm run dev`

