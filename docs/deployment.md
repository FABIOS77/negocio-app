# Deployment

## Entornos

| Entorno | BD | Backend |
|---|---|---|
| Desarrollo | PostgreSQL local | npm run dev |
| Producción | Supabase | Render Web Service |

## Variables de entorno requeridas

Ver .env.example en la raiz del proyecto.

Obligatorias:
- DATABASE_URL — Connection string de PostgreSQL
- JWT_ACCESS_SECRET — Secreto para firmar access tokens (min 32 chars)
- JWT_REFRESH_SECRET — Secreto para firmar refresh tokens (distinto del anterior)
- NODE_ENV — development | production | test
- PORT — Puerto HTTP (Render lo inyecta automaticamente)
- CORS_ORIGIN — Origin permitido (URL de la app)

Opcionales:
- LOG_LEVEL — info | debug | warn | error

## Render

- Tipo: Web Service (Node.js)
- Build command: npm install && npm run build
- Start command: npm start
- Variables: configurar en el dashboard de Render (nunca en código)
- Health check: GET /health

## GitHub → Render

- Branch main → deploy automático en Render
- Branch develop → desarrollo local
- No hay pipeline CI/CD complejo en V1

## Checklist de deploy

1. Configurar todas las variables de entorno en Render.
2. Verificar conexión a Supabase desde Render (IP allowlist si aplica).
3. Ejecutar migraciones: npx sequelize-cli db:migrate --env production
4. Verificar GET /health responde 200.
5. Verificar POST /api/v1/auth/login funciona.

## Rollback

1. npx sequelize-cli db:migrate:undo --env production (si la migración falló)
2. Redeploy del commit anterior en Render.
