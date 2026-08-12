# CLAUDE.md

## Proyecto

Sistema móvil para gestionar pedidos y contabilidad básica de un negocio familiar de venta de comida.

El proyecto será inicialmente desarrollado desde el backend.

## Objetivo actual

Construir primero un backend REST sólido, seguro y preparado para:

* Aplicación móvil Flutter.
* Funcionamiento offline.
* Sincronización entre múltiples dispositivos.
* PostgreSQL como base de datos central.
* Reportes.
* Exportación de información.
* Crecimiento futuro.

## Stack backend

* Node.js
* TypeScript
* Express
* Sequelize
* PostgreSQL
* Zod
* JWT
* Argon2
* Vitest

## Infraestructura prevista

* PostgreSQL: Supabase
* Backend: Render
* Repositorio: GitHub

## Principios arquitectónicos

* API REST versionada.
* Separación por módulos.
* Controllers delgados.
* Services para lógica de negocio.
* Sequelize para persistencia.
* DTOs para entrada y salida.
* Validación mediante Zod.
* Manejo centralizado de errores.
* Variables de entorno para secretos.
* UUID para entidades sincronizables.
* Idempotencia en operaciones de sincronización.
* No confiar en datos calculados enviados por el cliente.
* Mantener lógica de negocio fuera de los controllers.
* Mantener la aplicación preparada para múltiples dispositivos.

## Regla importante

El backend es la fuente central de verdad para los datos sincronizados.

Flutter será responsable posteriormente de la persistencia local y de la cola de sincronización, pero el backend debe proporcionar los mecanismos necesarios para recibir y procesar cambios de forma segura e idempotente.

## Alcance V1

Incluir:

* autenticación
* usuarios
* platos
* menú diario
* pedidos
* gastos
* categorías de gastos
* reportes
* exportación Excel
* sincronización

Los pedidos solamente tendrán inicialmente:

* PENDIENTE
* ENTREGADO
* CANCELADO

No implementar:

* PREPARANDO
* LISTO
* inventario
* proveedores
* WhatsApp
* IA
* facturación electrónica
* repartidores
* impresión térmica
* machine learning
* roles complejos

## Regla de alcance

No implementar funcionalidades que no estén especificadas.

Si una decisión afecta la arquitectura, detenerse y documentarla antes de realizar cambios.

## Calidad

Todo código nuevo debe:

* ser tipado correctamente.
* tener manejo de errores.
* ser testeable.
* respetar la arquitectura definida.
* evitar duplicación innecesaria.
* incluir tests cuando corresponda.

No generar código masivo sin una especificación previa.
