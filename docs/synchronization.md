# Synchronization Engine Protocol (Backend V1)

## Principios

- Flutter opera offline-first. Pedidos, gastos, platos, menús y categorías pueden crearse o modificarse sin conexión.
- El backend PostgreSQL es la fuente de verdad central.
- Los UUIDs v4 generados por el cliente son los identificadores técnicos permanentes.
- La sincronización es bidireccional: **PUSH** (cliente → servidor) y **PULL** (servidor → cliente).
- El protocolo es **atómico**, **idempotente** y **determinista**.

---

## 1. Push — Cliente hacia servidor

### Endpoint
`POST /api/v1/sync/push` (requiere cabecera `Authorization: Bearer <JWT>`)

### Body
```json
{
  "operations": [
    {
      "operation_id": "uuid-op-1 (idempotency key)",
      "entity_type": "order|expense|dish|daily_menu|expense_category",
      "entity_id": "uuid-ent-1",
      "operation": "CREATE|UPDATE|DELETE",
      "payload": {},
      "client_timestamp": "2026-08-12T12:00:00.000Z",
      "base_version": 1
    }
  ]
}
```

### Proceso de Ejecución (Atómico por operación)
1. **Idempotencia (`operation_id`)**: Se busca en la tabla `sync_operations`. Si ya existe, se devuelve el resultado previamente guardado con `status: "DUPLICATE"`.
2. **Seguridad**:
   - `processed_by` se obtiene del JWT autenticado (`req.user.sub`).
   - `entity_type = 'user'` con `operation = 'CREATE'` es rechazado (`USER_OFFLINE_CREATE_FORBIDDEN`).
3. **Concurrencia Optimista (UPDATE/DELETE)**:
   - Se compara `entity.version` con `base_version` enviada por el cliente.
   - Si no coinciden: `status: "CONFLICT"`. El servidor retorna la versión y datos actuales del servidor sin modificar la BD ni escribir en `change_log`.
4. **Transacción de Dominio**:
   - Se aplica la operación vía los servicios de dominio (`orders.service`, `expenses.service`, etc.).
   - Se incrementa `version`.
   - Se inserta un evento en `change_log` (asigna `server_change_id`).
   - Se registra el resultado en `sync_operations` (`status: "PROCESSED"`).

### Response
```json
{
  "success": true,
  "data": {
    "processed": 1,
    "failed": 0,
    "results": [
      {
        "operation_id": "uuid-op-1",
        "status": "PROCESSED|DUPLICATE|CONFLICT|FAILED",
        "server_version": 2,
        "server_change_id": 1004,
        "data": {}
      }
    ]
  }
}
```

---

## 2. Pull — Servidor hacia cliente

### Endpoint
`GET /api/v1/sync/pull?cursor=1000&limit=100&entity_types=order,expense`

### Cursor Incremental (`server_change_id`)
- `change_log.server_change_id` es un entero `BIGSERIAL` autoincremental.
- El cliente envía `cursor` (último `server_change_id` recibido).
- El servidor devuelve todas las entradas con `server_change_id > cursor`.
- Se permite filtrado opcional por `entity_types` (separados por coma).

### Response
```json
{
  "success": true,
  "data": {
    "changes": [
      {
        "server_change_id": 1004,
        "entity_type": "order",
        "entity_id": "uuid",
        "operation": "CREATE|UPDATE|DELETE",
        "data": {},
        "version": 2,
        "created_at": "2026-08-12T12:00:00.000Z"
      }
    ],
    "next_cursor": 1004,
    "has_more": false
  }
}
```

---

## 3. Matriz de Manejo de Conflictos (V1)

| Caso | Comportamiento del Servidor |
|---|---|
| CREATE con UUID nuevo | Creado exitosamente (`version: 1`, `PROCESSED`) |
| CREATE con UUID existente | Idempotente (`PROCESSED` o `DUPLICATE`) |
| UPDATE con `base_version` correcta | Aplicado exitosamente (`version++`, `PROCESSED`) |
| UPDATE con `base_version` obsoleta | Rechazado (`CONFLICT`). Devuelve estado y versión del servidor |
| DELETE con `base_version` correcta | Soft-delete aplicado (`version++`, `PROCESSED`) |
| DELETE con `base_version` obsoleta | Rechazado (`CONFLICT`). |

---

## 4. Retención del Change Log
En V1 el historial de `change_log` se conserva indefinidamente debido al volumen controlado previsto.

---

## 5. Decisiones Arquitectónicas Relacionadas
- **ADR-005**: Generación de `order_number` por el servidor.
- **ADR-006**: Valores monetarios `DECIMAL(10,2)` en BOB.
- **ADR-007**: Idempotencia en POST /orders por UUID.
- **ADR-008**: Protocolo y Motor de Sincronización Offline (Push & Pull).
