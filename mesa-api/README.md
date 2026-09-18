# mesa-api

FastAPI backend for the Mesa247 waiting list app.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`.

## MySQL schema

Set `DATABASE_URL` when connecting the API to MySQL:

```bash
export DATABASE_URL="mysql+pymysql://mesa_user:mesa_password@127.0.0.1:3306/mesa247"
```

Create the required tables with:

```bash
mysql -u mesa_user -p mesa247 < database/schema.sql
```
