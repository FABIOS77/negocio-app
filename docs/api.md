# API Reference

Base URL: /api/v1

> Sprint 2 implementado: /auth, /users/me, /dishes, /daily-menus (incluyendo /draw).

## Autenticación

Todos los endpoints (salvo /auth/*) requieren: Authorization: Bearer <access_token>

## /auth

### POST /auth/login
Body: { email, password }
Response 200: { accessToken, refreshToken, user }
Errores: 400, 401, 403

### POST /auth/refresh
Body: { refreshToken }
Response 200: { accessToken }
Errores: 401

### POST /auth/logout
Body: { refreshToken }
Response 204
Errores: 401

## /users

### GET /users/me — Response 200: UserDTO
### PATCH /users/me — Body: { name?, password? } — Response 200: UserDTO

## /dishes

### GET /dishes — Query: ?active&page&limit — Response 200: { data, pagination }
### POST /dishes — Body: { name, description?, price, image_url?, active? } — 201
### GET /dishes/:id — 200 | 404
### PUT /dishes/:id — Body campos opcionales — 200 | 404
### DELETE /dishes/:id — 204 soft-delete | 404 | 409

## /daily-menus

### GET /daily-menus — Query: ?date — Response 200: DailyMenuDTO[]
### GET /daily-menus/today — Response 200: DailyMenuDTO | null
### POST /daily-menus — Body: { menu_date, dish_ids[] } — 201 | 409 | 422
### GET /daily-menus/:id — 200 | 404
### PUT /daily-menus/:id — Body: { dish_ids?, active? } — 200

## /orders

No existe DELETE. Cancelar via PATCH status.

### GET /orders — Query: ?status&date&page&limit — Response 200: { data, pagination }
### POST /orders
Body: { id?, customer_name, location_text?, payment_method, ordered_at?, items[] }
items[]: { dish_id, quantity }
Response 201: OrderDTO (order_number y total calculados en backend)
Errores: 400, 409, 422

### GET /orders/:id — 200 | 404
### PATCH /orders/:id/status — Body: { status: DELIVERED|CANCELLED } — 200 | 400 | 404

## /expenses

### GET /expenses — Query: ?category_id&date_from&date_to&page&limit — 200
### POST /expenses — Body: { id?, description, amount, category_id, payment_method, expense_date } — 201
### GET /expenses/:id — 200 | 404
### PUT /expenses/:id — Body campos opcionales — 200
### DELETE /expenses/:id — 204 soft-delete
### GET /expenses/categories — 200: ExpenseCategoryDTO[]
### POST /expenses/categories — Body: { name } — 201

## /reports

Reglas de status:
- Ventas y produccion: incluye PENDING y DELIVERED, excluye CANCELLED
- Gastos: todos los no eliminados
- Resultado: ventas - gastos

### GET /reports/sales — Query: ?period&date_from&date_to
Response: { total_sales, order_count, currency, by_payment_method, period }

### GET /reports/expenses — Query: ?date_from&date_to
Response: { total_expenses, currency, by_category[] }

### GET /reports/result — Query: ?date_from&date_to
Response: { total_sales, total_expenses, result, currency }

### GET /reports/top-dishes — Query: ?date_from&date_to&limit
Response: [{ dish_id, dish_name, total_quantity, total_revenue }]

### GET /reports/production — Query: ?date
Response: [{ dish_id, dish_name, total_quantity }]
Fecha interpretada en America/La_Paz.

### GET /reports/export — Query: ?date_from&date_to&sections
Response: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

## /sync

### POST /sync/push
Body: { operations[]: { operation_id, entity_type, entity_id, operation, payload, entity_version, client_timestamp } }
Response 200: { processed, failed, results[]: { operation_id, status, error? } }
Status por operacion: PROCESSED | FAILED | CONFLICT

### GET /sync/pull
Query: ?cursor&entity_types&limit
Response 200: { changes[], next_cursor, has_more }
changes[]: { cursor, entity_type, entity_id, operation, snapshot, changed_at }

## Errores comunes

| Código | Significado |
|---|---|
| 400 | Validación Zod fallida |
| 401 | Token inválido o ausente |
| 403 | Usuario inactivo |
| 404 | Recurso no encontrado |
| 409 | Conflicto (duplicado, version desactualizada) |
| 422 | Regla de negocio violada (plato inactivo, etc.) |
| 500 | Error interno (sin detalles en producción) |
