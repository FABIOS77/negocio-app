# API Reference — Negocio Katering Backend (V1 Final)

Base URL: `/api/v1`

Todas las respuestas exitosas y de error siguen el contrato estandarizado:

**Respuesta Exitosa**:
```json
{
  "success": true,
  "data": {}
}
```

**Respuesta de Error**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensaje legible"
  }
}
```

---

## 🏥 Sistema & Salud (Públicos)

- `GET /health`: Estado básico del servidor HTTP Express.
- `GET /health/db`: Conectividad activa con PostgreSQL (200 OK | 503 Service Unavailable).

---

## 🔑 Autenticación (`/auth`) (Público, Rate Limited)

- `POST /auth/login`: Autenticar usuario -> `{ accessToken, refreshToken, user }`
- `POST /auth/refresh`: Renovar access token -> `{ accessToken }`
- `POST /auth/logout`: Revocar refresh token -> 204 No Content

---

## 👤 Usuarios (`/users`) (Requiere JWT)

- `GET /users/me`: Perfil de usuario autenticado.
- `PATCH /users/me`: Actualizar nombre o contraseña.

---

## 🍲 Platos (`/dishes`) (Requiere JWT)

- `GET /dishes?active=true&page=1&limit=20`: Listado paginado de platos.
- `POST /dishes`: Crear plato -> `{ id?, name, description?, price, active? }`
- `GET /dishes/:id`: Obtener plato por ID.
- `PUT /dishes/:id`: Actualizar plato.
- `DELETE /dishes/:id`: Soft-delete de plato.

---

## 📅 Menús Diarios (`/daily-menus`) (Requiere JWT)

- `GET /daily-menus?date=YYYY-MM-DD`: Listar menús por fecha.
- `GET /daily-menus/today`: Menú activo de hoy.
- `POST /daily-menus`: Crear/Reemplazar menú -> `{ id?, menu_date, dish_ids[] }`
- `GET /daily-menus/:id`: Detalle de menú diario.
- `PUT /daily-menus/:id`: Actualizar platos del menú diario.

---

## 📦 Pedidos (`/orders`) (Requiere JWT)

- `GET /orders?status=PENDING&date=YYYY-MM-DD&page=1&limit=20`: Listar pedidos.
- `POST /orders`: Crear pedido idempotente -> `{ id?, customer_name, payment_method, items[] }`
- `GET /orders/:id`: Detalle del pedido.
- `PATCH /orders/:id/status`: Cambiar estado (`PENDING` -> `DELIVERED` | `CANCELLED`).

---

## 💰 Gastos (`/expenses`) (Requiere JWT)

- `GET /expenses?category_id=UUID&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&page=1&limit=20`
- `POST /expenses`: Registrar gasto -> `{ id?, description, amount, category_id, payment_method, expense_date }`
- `GET /expenses/:id`: Detalle de gasto.
- `PUT /expenses/:id`: Actualizar gasto.
- `DELETE /expenses/:id`: Soft-delete de gasto.
- `GET /expenses/categories`: Listar categorías activas.
- `POST /expenses/categories`: Crear categoría de gastos.
- `PATCH /expenses/categories/:id`: Actualizar categoría.

---

## 📊 Reportes (`/reports`) (Requiere JWT)

- `GET /reports/production?date=YYYY-MM-DD`: Resumen de producción consolidado.
- `GET /reports/sales?period=day|week|month|custom`: Resumen de ventas.
- `GET /reports/expenses?period=day|week|month|custom`: Resumen de gastos por categoría y método de pago.
- `GET /reports/result?period=day|week|month|custom`: Resultado financiero neto (Ventas - Gastos).
- `GET /reports/top-dishes?period=day|week|month|custom`: Ranking de platos más vendidos.
- `GET /reports/export?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`: Exportar reporte consolidado en archivo Excel `.xlsx` (contiene 4 hojas: Resumen, Pedidos, Gastos, Platos).

---

## 🔄 Sincronización Offline (`/sync`) (Requiere JWT, Rate Limited)

- `POST /sync/push`: Enviar lote de operaciones offline del cliente (Atómico, Idempotente, Concurrencia Optimista).
- `GET /sync/pull?cursor=N&limit=100`: Obtener cambios incrementales registrados en el servidor desde el cursor `server_change_id`.
