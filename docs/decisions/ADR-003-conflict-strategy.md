# ADR-003 — Estrategia de conflictos: Server-Wins + Versioning

## Estado: Aprobado

## Contexto

Dos dispositivos pueden editar el mismo registro offline simultáneamente.
Se necesita una estrategia determinista y simple para V1.

## Decisión

Usar server-wins con campo version INTEGER en entidades sincronizables.

## Flujo

1. Cliente lee entidad con version=N.
2. Otro dispositivo actualiza → version=N+1 en servidor.
3. Cliente envía UPDATE con entity_version=N.
4. Servidor detecta N < N+1 → conflicto → rechaza con status CONFLICT.
5. Cliente hace pull para obtener versión actual y re-aplica si es necesario.

## Reglas

- CREATE: sin conflicto si UUID nuevo.
- UPDATE: requiere entity_version correcta.
- DELETE: se aplica si version >= version del servidor.
- No se implementa CRDT.

## Consecuencias

- Simple y predecible.
- El cliente debe manejar respuestas CONFLICT y re-sincronizar.
- Adecuado para un negocio familiar con pocos usuarios simultáneos.
