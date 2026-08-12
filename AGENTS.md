# AGENTS.md

## Forma de trabajo

Antes de modificar código:

1. Analizar la estructura existente.
2. Leer la documentación relevante.
3. Identificar las dependencias afectadas.
4. Explicar brevemente el plan.
5. Implementar cambios pequeños y verificables.
6. Ejecutar tests.
7. Ejecutar lint/typecheck cuando corresponda.
8. Revisar los cambios antes de finalizar.

## Reglas

No modificar arquitectura sin justificarlo.

No instalar dependencias innecesarias.

No crear archivos duplicados con responsabilidades similares.

No colocar lógica de negocio compleja en controllers.

No colocar acceso directo a PostgreSQL fuera de la capa de persistencia.

No exponer secretos.

No utilizar credenciales reales dentro del código.

No realizar cambios destructivos en la base de datos sin confirmación.

## Backend

Utilizar TypeScript.

Utilizar Express.

Utilizar Sequelize.

Utilizar PostgreSQL.

Utilizar DTOs y validación.

Utilizar servicios para lógica de negocio.

Utilizar UUID para entidades sincronizables.

Preparar las operaciones de sincronización para ser idempotentes.

## Git

Realizar cambios pequeños.

Utilizar commits descriptivos.

No realizar commits gigantes.

No subir archivos .env.

Mantener .env.example actualizado.

## Regla principal

No asumir requisitos que no hayan sido definidos.

Si existe una decisión arquitectónica importante que no está definida, preguntar antes de implementarla.
