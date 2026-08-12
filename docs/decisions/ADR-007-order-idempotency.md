# ADR-007 — Idempotencia en POST /orders

## Estado: Aprobado

## Contexto

Flutter crea pedidos offline con un UUID generado localmente.
Al sincronizar, el mismo UUID puede ser enviado varias veces (retries por timeout, reintento manual).
El backend debe garantizar que un mismo pedido no se duplique.

## Decisión

1. **POST /api/v1/orders acepta un campo `id` opcional (UUID).**
2. Si el `id` recibido ya existe en la BD:
   - No crear un nuevo pedido.
   - Retornar el pedido existente con HTTP **200**.
3. Si el `id` no existe (primera vez):
   - Crear el pedido normalmente.
   - Retornar el pedido creado con HTTP **201**.
4. Si no se envía `id`, el servidor genera uno con `crypto.randomUUID()`.

## Comportamiento observable

| Escenario | HTTP | Cuerpo |
|---|---|---|
| Primera creación sin `id` | 201 | Pedido nuevo |
| Primera creación con `id` nuevo | 201 | Pedido nuevo |
| Retry con mismo `id` | 200 | Pedido existente (sin cambios) |

## Garantías

- Un mismo UUID nunca genera dos pedidos.
- La respuesta es semánticamente idéntica para el cliente en ambos casos (mismo body, distinto status code).
- El cliente puede distinguir creación nueva (201) de retry (200) si necesita.

## Implementación

- La verificación de existencia se hace ANTES de cualquier validación de negocio.
- Si el id existe → retorno inmediato (sin verificar dishes, precios, etc.).
- La constraint UNIQUE sobre `orders.id` en PostgreSQL garantiza consistencia incluso en condiciones de carrera (dos requests simultáneos con mismo UUID → uno falla con error de BD, el otro responde normalmente).

## Relación con Sync

- En el flujo de Sync Push (futuro), `sync_operations.operation_id` provee una capa adicional de idempotencia a nivel de operación.
- La idempotencia por UUID en este endpoint es suficiente para Sprint 3 (online con retries).
- Sprint 4+ añadirá la tabla `sync_operations` para el flujo completo offline.

## Consecuencias

- El cliente debe generar UUIDs RFC 4122 válidos para aprovechar la idempotencia.
- El backend no expone información adicional sobre si el pedido era pre-existente más allá del HTTP status code.
