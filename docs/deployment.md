# Guía de Despliegue — Render & Supabase PostgreSQL

Este documento contiene la guía paso a paso para desplegar el backend Express/TypeScript en **Render** utilizando **Supabase PostgreSQL** como base de datos administrada.

---

## 1. Configuración de Base de Datos en Supabase

1. Crear un proyecto en [Supabase](https://supabase.com/).
2. Ir a **Project Settings -> Database** y copiar la **URI de conexión de Transaction Pooler** (Puerto `6543`) o Session Pooler (Puerto `5432`).
3. Formato de la URL:
   `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
4. Asegurar que las variables de entorno de producción contengan `DATABASE_URL`. El backend incluye automáticamente la configuración SSL requerida por Supabase (`rejectUnauthorized: false`).

---

## 2. Configuración del Web Service en Render

1. En el panel de Render, seleccionar **New + -> Web Service**.
2. Conectar el repositorio GitHub/GitLab del proyecto.
3. Ajustar los parámetros del servicio:

| Parámetro | Valor |
|---|---|
| **Name** | `negocio-katering-backend` |
| **Environment** | `Node` |
| **Region** | Oregon (o la más cercana a Supabase) |
| **Branch** | `main` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/health` o `/health/db` |

---

## 3. Variables de Entorno en Render

Configurar las siguientes variables en la sección **Environment** de Render:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
JWT_ACCESS_SECRET=clave_aleatoria_de_al_menos_32_caracteres_extremadamente_segura
JWT_REFRESH_SECRET=otra_clave_diferente_de_al_menos_32_caracteres_extremadamente_segura
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=30d
CORS_ORIGIN=https://tu-app-flutter.web.app
```

> [!CAUTION]
> NUNCA usar `CORS_ORIGIN=*` en producción. Especificar las URLs exactas autorizadas.

---

## 4. Ejecución de Migraciones en Producción

Antes de iniciar el servicio por primera vez o al desplegar nuevas versiones con cambios en la base de datos, ejecutar las migraciones desde la terminal de Render o mediante un job de pre-deploy:

```bash
npx sequelize-cli db:migrate --env production
```

Para verificar el estado de las migraciones:
```bash
npx sequelize-cli db:migrate:status --env production
```

---

## 5. Verificación del Despliegue (Smoke Test)

Una vez que Render marque el servicio como **Live**, ejecutar los health checks:

1. **HTTP Health Check**:
   `GET https://negocio-katering-backend.onrender.com/health` -> HTTP 200 `{ "success": true, "data": { "status": "ok" } }`

2. **Database Health Check**:
   `GET https://negocio-katering-backend.onrender.com/health/db` -> HTTP 200 `{ "success": true, "data": { "status": "ok", "database": "connected" } }`

3. **Smoke Test Completo**:
   ```bash
   npx tsx scripts/smoke-test.ts https://negocio-katering-backend.onrender.com
   ```
