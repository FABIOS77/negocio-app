# ADR-008 — Protocolo y Motor de Sincronización Offline (Push & Pull)

## Estado: Aprobado

## Contexto

Múltiples dispositivos móviles Flutter operarán sin conexión continua a Internet.
Los dispositivos deben poder crear, actualizar y cancelar/eliminar pedidos, gastos, platos, menús diarios y categorías sin conexión, encolar operaciones localmente y transmitirlas al servidor cuando se restablezca la conectividad.

El servidor es la fuente de verdad central y debe ser idempotente, atómico y determinista.

## Decisión

### 1. Clave de Idempotencia (`operation_id`)
- Cada operación enviada en `POST /api/v1/sync/push` lleva un `operation_id` (UUID v4) generado por el cliente.
- El servidor almacena el estado y resultado de cada operación en la tabla `sync_operations`.
- Si se recibe un `operation_id` ya procesado (debido a timeouts o reintentos), el servidor omite la re-ejecución del dominio y retorna `status: "DUPLICATE"` con el resultado previo (`resultData`).

### 2. Cursor de Cambio Incremental (`server_change_id`)
- La tabla `change_log` almacena una secuencia mono-incremental de cambios mediante la columna `server_change_id` (tipo `BIGSERIAL`).
- El cliente realiza `GET /api/v1/sync/pull?cursor=100` para recibir únicamente cambios con `server_change_id > cursor`.
- El cursor es independiente del reloj del dispositivo o servidor, eliminando pérdidas de cambios y sesgos de zona horaria.

### 3. Control de Concurrencia Optimista y Detección de Conflictos
- Las entidades sincronizables mantienen una columna `version` de entero secuencial.
- Las operaciones `UPDATE` y `DELETE` enviadas por el cliente incluyen `base_version`.
- Si `server.version !== client.base_version`:
  - La operación se rechaza con `status: "CONFLICT"`.
  - El servidor retorna la versión actual y el snapshot de la BD del servidor sin aplicar los cambios del cliente ni registrar nuevas filas en `change_log`.

### 4. Transaccionalidad Atómica
- Cada operación del batch se ejecuta dentro de una transacción Sequelize `t` que incluye:
  1. Aplicación de la operación en la entidad de dominio (vía services).
  2. Incremento de la versión de la entidad.
  3. Registro del evento en `change_log`.
  4. Registro del resultado en `sync_operations`.

### 5. Reglas Específicas por Entidad
- `users`: No se permite la creación de usuarios offline (`USER_OFFLINE_CREATE_FORBIDDEN`).
- `orders`: Mantiene idempotencia por `id` (UUID). La cancelación (`UPDATE status = 'CANCELLED'`) valida transiciones de estado a través de `orders.service.ts`.
- `expense_categories`: La eliminación de categorías con gastos históricos conmuta `active = false` preservando el historial.

## Consecuencias

- Los dispositivos Flutter pueden encolar cambios offline con seguridad.
- PULL permite paginación determinista (`limit` y `has_more`).
- La retención del `change_log` en V1 es indefinida debido al volumen ligero previsto.
