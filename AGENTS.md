# AGENTS

Guía rápida de la estructura actual del proyecto.

## Raíz

- `AGENTS.md`: este archivo. Resume qué hay en las carpetas principales del proyecto.
- `.DS_Store`: archivo de metadatos generado por macOS.
- `.idea/`: configuración local del IDE. No contiene código de la aplicación.
- `mesa-queue/`: carpeta reservada para el frontend. Actualmente solo contiene caché de Vite en `.vite/`.

## `mesa-queue/`

Frontend de la cola de espera. En la estructura actual solo existe:

- `.vite/`: caché interna generada por Vite. No debe tratarse como código fuente.

Cuando el frontend esté completo, esta carpeta debería contener archivos como `package.json`, `src/`, `vite.config.ts` y configuración de Tailwind/shadcn.

## `mesa-api/`

Backend FastAPI esperado para la API de la cola. Esta carpeta no existe actualmente en disco.

Cuando se cree, debería contener la aplicación FastAPI, rutas, esquemas, configuración, pruebas y su archivo `pyproject.toml`.
