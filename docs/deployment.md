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

## 5. Verificación del Despliegue y Pruebas Remotas

Servicio Render activo en: `https://katering-grecia-app.onrender.com`

Una vez que Render marque el servicio como **Live**, ejecutar las siguientes herramientas de verificación:

1. **HTTP Health Check**:
   `GET https://katering-grecia-app.onrender.com/health` -> HTTP 200 `{ "success": true, "data": { "status": "ok" } }`

2. **Database Health Check**:
   `GET https://katering-grecia-app.onrender.com/health/db` -> HTTP 200 `{ "success": true, "data": { "status": "ok", "database": "connected" } }`

3. **Pruebas de Solo Lectura (No Destructivas)**:
   ```bash
   npx tsx scripts/test-remote.ts https://katering-grecia-app.onrender.com
   ```

4. **Pruebas de Autenticación**:
   ```bash
   npx tsx scripts/test-remote-auth.ts https://katering-grecia-app.onrender.com
   ```

5. **Pruebas de Sincronización Multi-Dispositivo**:
   ```bash
   npx tsx scripts/test-remote-sync.ts https://katering-grecia-app.onrender.com
   ```

6. **Pruebas de Reportes y Cálculos Financieros**:
   ```bash
   npx tsx scripts/test-remote-reports.ts https://katering-grecia-app.onrender.com
   ```

7. **Smoke Test Mutativo Completo (10 pasos)**:
   > [!WARNING]
   > El smoke test completo inserta datos de prueba (platos, pedidos, gastos). Utilizar únicamente durante fases de desarrollo/hardening previa a la salida a producción oficial.
   ```bash
   npx tsx scripts/smoke-test.ts https://katering-grecia-app.onrender.com
   ```

---

## 6. Procedimiento de Respaldo (Backup) & Restauración de Base de Datos

### Generación de Copia de Seguridad Completa (`pg_dump`)
Antes de realizar cualquier mantenimiento o limpieza en la base de datos de Supabase, ejecute un respaldo completo que incluya estructura, datos, secuencias, índices y restricciones:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup_katering_$(date +%Y%m%d_%H%M%S).dump
```

> [!CAUTION]
> Los archivos de backup `.dump` o `.sql` contienen datos operativos y nunca deben subirse al repositorio Git.

### Restauración de Copia de Seguridad (`pg_restore`)
Para restaurar el respaldo en una base de datos de emergencia o entorno de recuperación:

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" backup_katering_YYYYMMDD_HHMMSS.dump
```

---

## 7. Herramientas CLI de Producción

### Bootstrap del Administrador Inicial Real
Para crear el usuario administrador inicial en una base de producción recién aprovisionada:

```bash
BOOTSTRAP_ADMIN_NAME="Administrador Principal" \
BOOTSTRAP_ADMIN_EMAIL="admin@negociokatering.com" \
BOOTSTRAP_ADMIN_PASSWORD="PasswordSeguro123!" \
BOOTSTRAP_CONFIRM="true" \
npm run db:bootstrap-admin
```

### Inventario de Datos (Solo Lectura)
Para inspeccionar el volumen de filas por tabla antes de un mantenimiento:
```bash
npm run db:inventory
```

---

## 8. Plan Transaccional de Limpieza para Transición a Producción

> [!WARNING]
> La limpieza borra de forma irreversible los datos de prueba respetando la integridad referencial. **No ejecutar sin confirmación explícita y backup previo.**

### Orden de Limpieza por Dependencias:
1. `order_items` (Depende de `orders`)
2. `orders`
3. `daily_menu_dishes` (Depende de `daily_menus` y `dishes`)
4. `daily_menus`
5. `expenses` (Depende de `expense_categories`)
6. `sync_operations`
7. `change_log` (Reinicia el cursor incremental para el cliente móvil)
8. `dishes`
9. `expense_categories` (Opcional: mantener categorías base creadas)
10. `refresh_tokens` (Depende de `users`)
11. `users` (Se elimina usuario dev y se ejecuta el `db:bootstrap-admin`)

---

## 9. Evolución Futura de Exportación Excel (V2)

Para volúmenes masivos de datos en etapas futuras de crecimiento, se consideran las siguientes optimizaciones de arquitectura:
- **Procesamiento Asíncrono**: Cola de trabajos en background (ej. BullMQ / Redis) que notifique vía WebSocket o Push al completar la generación del archivo `.xlsx`.
- **Integración Nube**: Almacenamiento en Google Drive / Supabase Storage con URLs firmadas temporales para descarga.
- **Google Apps Script**: Sincronización automática de hojas de cálculo de Google Sheets para reportes ejecutivos en tiempo real.
