# ADR-001 — UUID para entidades sincronizables

## Estado: Aprobado

## Contexto

La aplicación Flutter opera offline y puede crear entidades (pedidos, gastos) sin conexión.
Múltiples dispositivos pueden crear entidades simultáneamente.

## Decisión

Usar UUID v4 como identificador primario de todas las entidades que participan en sincronización.
El UUID es generado por el cliente antes de sincronizar.

## Entidades con UUID

- users, refresh_tokens, dishes, daily_menus, orders, order_items, expenses, expense_categories, sync_operations

## Consecuencias

- No hay colisión de IDs entre dispositivos.
- El servidor puede recibir un CREATE con un UUID ya conocido y detectar idempotencia.
- order_number es un identificador legible separado, asignado por el servidor. Ver ADR-005.
