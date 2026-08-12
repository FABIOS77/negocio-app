# Negocio Katering — Backend

API REST para gestión de pedidos y contabilidad de un negocio familiar de venta de comida.

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| Node.js | ≥ 20 | Runtime |
| TypeScript | ^6 | Tipado |
| Express | ^5 | Framework HTTP |
| Sequelize | ^6 | ORM |
| PostgreSQL | — | Base de datos (Supabase) |
| Zod | ^4 | Validación |
| JWT | — | Autenticación |
| Argon2 | — | Hashing de contraseñas |
| Vitest | ^4 | Testing |

## Requisitos previos

- Node.js ≥ 20
- npm ≥ 10
- PostgreSQL accesible (local o Supabase)

---

## Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd negocio-app

# Instalar dependencias
npm install
```

---

## Configuración de variables de entorno

```bash
# Copiar el template
cp .env.example .env

# Editar .env con tus valores reales
```

Variables requeridas:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno | `development` |
| `PORT` | Puerto HTTP | `3000` |
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_ACCESS_SECRET` | Secreto JWT access token (≥32 chars) | *(aleatorio seguro)* |
| `JWT_REFRESH_SECRET` | Secreto JWT refresh token (≥32 chars) | *(diferente al anterior)* |
| `ACCESS_TOKEN_EXPIRES` | Duración access token | `15m` |
| `REFRESH_TOKEN_EXPIRES` | Duración refresh token | `30d` |
| `CORS_ORIGIN` | Origin permitido | `*` (dev) / URL exacta (prod) |

> Para generar secretos seguros:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

---

## Ejecución en desarrollo

```bash
npm run dev
```

El servidor se reinicia automáticamente al detectar cambios en `src/`.

---

## Migraciones de base de datos

```bash
# Aplicar migraciones pendientes
npm run db:migrate

# Ver estado de migraciones
npm run db:migrate:status

# Revertir última migración
npm run db:migrate:undo

# Revertir todas las migraciones
npm run db:migrate:undo:all
```

> Las migraciones deben ejecutarse antes de iniciar el servidor.
> En producción, ejecutarlas manualmente antes de cada deploy.

---

## Testing

```bash
# Ejecutar todos los tests
npm test

# Modo watch (re-ejecuta al guardar)
npm run test:watch

# Con cobertura
npm run test:coverage
```

Los tests NO requieren una base de datos activa para los tests unitarios e integración básica.

Para tests de integración con BD: configurar `DATABASE_URL_TEST` en `.env`.

---

## Build de producción

```bash
# Compilar TypeScript → dist/
npm run build

# Iniciar servidor de producción
npm start
```

El build de producción usa `tsconfig.build.json` y compila únicamente `src/`.

---

## Herramientas de calidad

```bash
# TypeScript typecheck (sin emitir archivos)
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formateo
npm run format
npm run format:check
```

---

## Estructura del proyecto

```
negocio-app/
├── src/
│   ├── config/
│   │   ├── env.ts              # Validación de variables de entorno (Zod)
│   │   └── constants.ts        # Constantes de dominio
│   ├── database/
│   │   ├── sequelize.ts        # Instancia Sequelize compartida
│   │   ├── associations.ts     # Relaciones entre modelos
│   │   └── migrations/         # Migraciones Sequelize CLI
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # JWT verify (Sprint 2)
│   │   ├── error.middleware.ts # Manejo centralizado de errores
│   │   ├── validate.middleware.ts # Validación Zod reutilizable
│   │   └── rate-limit.middleware.ts
│   ├── modules/
│   │   ├── auth/               # Login, refresh, logout (Sprint 2)
│   │   ├── users/              # CRUD usuarios
│   │   ├── dishes/             # CRUD platos (Sprint 2)
│   │   ├── daily-menu/         # Menú diario (Sprint 2)
│   │   ├── orders/             # Pedidos (Sprint 2)
│   │   ├── expenses/           # Gastos (Sprint 3)
│   │   ├── reports/            # Reportes (Sprint 3)
│   │   └── sync/               # Sincronización offline (Sprint 4)
│   ├── utils/
│   │   ├── errors.ts           # Jerarquía de errores de dominio
│   │   └── response.ts         # Helpers de respuesta API
│   ├── app.ts                  # Express app (importar en tests)
│   └── server.ts               # Punto de entrada del servidor
├── tests/
│   ├── helpers/
│   │   └── setup.ts            # Setup Vitest (env vars de test)
│   ├── unit/                   # Tests unitarios (sin BD)
│   └── integration/            # Tests de integración
├── docs/                       # Documentación técnica
├── .env.example                # Template de variables de entorno
├── sequelize-config.js         # Config Sequelize CLI por entorno
├── .sequelizerc                # Rutas para Sequelize CLI
├── tsconfig.json               # TypeScript (typecheck + IDE)
├── tsconfig.build.json         # TypeScript (build producción)
└── vitest.config.ts            # Configuración Vitest
```

---

## Deploy en Render

Ver [`docs/deployment.md`](docs/deployment.md) para instrucciones completas.

**Resumen:**
1. Configurar variables de entorno en el dashboard de Render.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Ejecutar migraciones antes del primer deploy.

---

## Documentación técnica

- [`docs/architecture.md`](docs/architecture.md) — Arquitectura y capas
- [`docs/database.md`](docs/database.md) — Modelo de datos
- [`docs/api.md`](docs/api.md) — Referencia de endpoints
- [`docs/synchronization.md`](docs/synchronization.md) — Estrategia offline/sync
- [`docs/deployment.md`](docs/deployment.md) — Guía de deploy
- [`docs/openapi.yaml`](docs/openapi.yaml) — Contrato OpenAPI
- [`docs/decisions/`](docs/decisions/) — ADRs (Architecture Decision Records)

---

## Zona horaria de negocio

**`America/La_Paz` (UTC-4, sin DST)**

Los timestamps se almacenan en UTC. Las fechas de negocio y reportes se interpretan en `America/La_Paz`. Ver [ADR-004](docs/decisions/ADR-004-timezone.md).
