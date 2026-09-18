# Mesa247 Queue

Frontend de Mesa247 construido con Vite, React y TypeScript. Permite que los clientes se unan a la cola de espera y que el anfitrion gestione la cola desde el navegador.

## Requisitos

- Docker y Docker Compose
- Puerto `5174` disponible para el frontend
- Backend corriendo en `http://localhost:8000`

## Correr el frontend en Docker

Desde la raiz del repositorio, levanta primero el backend y la base de datos:

```bash
docker compose up -d --build mysql api
```

Luego levanta el frontend en su propio contenedor:

```bash
docker compose up -d --build queue
```

El frontend queda disponible en:

```text
http://localhost:5174
```

El contenedor del frontend se llama `mesa247-queue` y usa la variable:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

Ese valor apunta al backend publicado en la maquina local, porque las llamadas a la API se ejecutan desde el navegador.

## Levantar todo el proyecto

Tambien puedes levantar base de datos, backend y frontend con un solo comando:

```bash
docker compose up -d --build mysql api queue
```

Servicios resultantes:

- `mesa247-mysql`: MySQL en `localhost:3306`
- `mesa247-api`: FastAPI en `http://localhost:8000`
- `mesa247-queue`: React/Vite en `http://localhost:5174`

## Logs y apagado

Ver logs del frontend:

```bash
docker compose logs -f queue
```

Detener solo el frontend:

```bash
docker compose stop queue
```

Detener todo:

```bash
docker compose down
```

## Desarrollo local sin Docker

Si necesitas correrlo directamente en tu maquina:

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

Para cambiar la URL del backend:

```bash
VITE_API_BASE_URL=http://localhost:8000/api npm run dev -- --host 127.0.0.1 --port 5174
```

## Scripts disponibles

- `npm run dev`: servidor de desarrollo de Vite.
- `npm run build`: compila TypeScript y genera el build de produccion.
- `npm run lint`: ejecuta Oxlint.
- `npm run preview`: sirve localmente el build generado.
