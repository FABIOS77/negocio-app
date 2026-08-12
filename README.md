# Negocio Katering — Backend REST & Motor de Sincronización Offline

Backend en **Node.js / Express / TypeScript** con **Sequelize ORM** y **PostgreSQL** para la gestión operativa, pedidos, contabilidad y sincronización bidireccional offline-first de un negocio de catering.

---

## 🛠️ Tecnología

- **Runtime**: Node.js >= 20.0.0
- **Lenguaje**: TypeScript (estricto)
- **Framework**: Express v5
- **ORM**: Sequelize v6
- **Base de Datos**: PostgreSQL / Supabase PostgreSQL
- **Seguridad**: Argon2id, JWT (Access + Refresh tokens), Helmet, CORS, Rate Limiting
- **Validación**: Zod v4
- **Testing**: Vitest + Supertest

---

## 🚀 Inicio Rápido (Desarrollo Local)

### 1. Requisitos
- Node.js >= 20.0.0
- PostgreSQL corriendo localmente o una base de datos en Supabase

### 2. Configurar entorno
```bash
cp .env.example .env
```
Editar `.env` ajustando la variable `DATABASE_URL` y las claves `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.

### 3. Instalar dependencias
```bash
npm install
```

### 4. Ejecutar Migraciones & Seeders de Desarrollo
```bash
# Aplicar migraciones en la BD vacía
npm run db:migrate

# Poblar datos de prueba (Usuario admin dev, Categorías de gastos y Platos)
npm run db:seed
```

### 5. Iniciar Servidor en Desarrollo
```bash
npm run dev
```
El servidor escuchará en `http://localhost:3000`.

---

## 🧪 Pruebas & Verificación

```bash
# Verificación de tipos TypeScript
npm run typecheck

# Linter ESLint
npm run lint

# Ejecutar suite completa de tests (Unitarios e Integración)
npm test

# Ejecutar Smoke Test automatizado de 10 pasos contra servidor en ejecución
npm run test:smoke

# Compilar para producción
npm run build
```

---

## 🏥 Health Checks

- `GET /health`: Estado básico del servidor Express (`{"success": true, "data": {"status": "ok"}}`)
- `GET /health/db`: Conectividad activa con PostgreSQL (`{"success": true, "data": {"status": "ok", "database": "connected"}}`)

---

## 🔄 Protocolo de Sincronización Offline (Push & Pull)

- `POST /api/v1/sync/push`: Recibe lote de operaciones offline del cliente. Es **atómico** e **idempotente** vía `operation_id`. Implementa **concurrencia optimista** mediante `base_version` vs `version` del servidor.
- `GET /api/v1/sync/pull?cursor=N`: Devuelve los cambios incrementales registrados en la secuencia `server_change_id` de la tabla `change_log`.

---

## 📦 Despliegue en Render + Supabase

Consultar la guía detallada en [docs/deployment.md](docs/deployment.md).

### Comandos de Render:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/health` o `/health/db`
