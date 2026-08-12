# Synchronization

## Principios

- Flutter opera offline. Los pedidos y gastos pueden crearse sin conexión.
- El backend es la fuente de verdad.
- UUID generado por el cliente es el identificador técnico permanente.
- La sincronización es bidireccional: push (cliente→servidor) y pull (servidor→cliente).

## Push — Cliente hacia servidor

### Endpoint

POST /api/v1/sync/push

### Request

`json
{
  "operations": [
    {
      "operation_id": "uuid (idempotency key, generado por cliente)",
      "entity_type": "order",
      "entity_id": "uuid",
      "operation": "CREATE|UPDATE|DELETE",
      "payload": {},
      "entity_version": 3,
      "client_timestamp": "2026-08-11T20:00:00Z"
    }
  ]
}
`

### Procesamiento (por operación)

1. Verificar si operation_id ya existe en sync_operations.
   - Si existe con status=PROCESSED: retornar resultado anterior (idempotente).
2. Validar payload con Zod según entity_type + operation.
3. Para UPDATE/DELETE: comparar entity_version del payload con version actual del registro.
   - Si version del cliente < version del servidor: CONFLICT (server-wins). Retornar 409 parcial.
4. Aplicar operación en transacción:
   - CREATE: INSERT con entity_id del cliente.
   - UPDATE: UPDATE + version++.
   - DELETE: SET deleted_at = NOW() + version++.
5. Insertar fila en change_log.
6. Marcar sync_operation como PROCESSED.
7. En caso de error: marcar FAILED + registrar error_message.

### Response

`json
{
  "processed": 4,
  "failed": 1,
  "results": [
    { "operation_id": "uuid", "status": "PROCESSED|FAILED|CONFLICT", "error": "..." }
  ]
}
`

## Pull — Servidor hacia cliente

### Endpoint

GET /api/v1/sync/pull?cursor=1003&entity_types=order,expense&limit=100

### Cursor incremental

La tabla change_log tiene un id BIGSERIAL autoincremental.
El cliente guarda el último cursor recibido y lo envía en el siguiente pull.
El servidor devuelve todas las filas con id > cursor.

Ventajas sobre timestamp:
- No depende de relojes de dispositivos.
- No pierde cambios entre dos pulls.
- Paginable y determinista.

### Response

`json
{
  "changes": [
    {
      "cursor": 1004,
      "entity_type": "order",
      "entity_id": "uuid",
      "operation": "UPDATE",
      "snapshot": {},
      "changed_at": "2026-08-11T23:00:00Z"
    }
  ],
  "next_cursor": 1006,
  "has_more": false
}
`

El cliente guarda next_cursor y lo usa en el próximo pull.

## Manejo de conflictos (Server-Wins V1)

| Caso | Comportamiento |
|---|---|
| CREATE con UUID nuevo | Sin conflicto |
| UPDATE con version correcta | Se aplica, version++ |
| UPDATE con version desactualizada | Rechazado (CONFLICT). Cliente debe hacer pull. |
| DELETE | Aplicado si version >= version del servidor |

No se implementa CRDT en V1.

## Idempotencia

- operation_id es un UUID generado por el cliente.
- El servidor almacena cada operation_id en sync_operations.
- Si llega la misma operation_id dos veces: retornar resultado previo sin re-procesar.
- Garantiza que reenvíos por timeout no crean duplicados.

## order_number en contexto offline

Un pedido creado offline tiene UUID pero no order_number.
El servidor asigna order_number al procesar el push (CREATE).
El cliente recibe el order_number en el resultado del push o en el siguiente pull.
Ver decisions/ADR-005-order-number.md.
