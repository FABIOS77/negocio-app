# Architecture

## Overview

REST API modular para el backend de Negocio Katering. Consume una base de datos PostgreSQL (Supabase) y es consumida por una aplicación Flutter con capacidad offline.

## Stack

| Tecnología | Rol |
|---|---|
| Node.js + TypeScript | Runtime y tipado |
| Express | Framework HTTP |
| Sequelize | ORM |
| PostgreSQL (Supabase) | Base de datos central |
| Zod | Validación de inputs |
| JWT | Autenticación |
| Argon2 | Hashing de contraseñas |
| Vitest | Testing |

## Capas

`
Request → Router → Controller → Service → Repository → Sequelize Model → PostgreSQL
`

| Capa | Responsabilidad |
|---|---|
| **Router** | Rutas HTTP + middlewares |
| **Controller** | Recibe request, delega, devuelve response |
| **Service** | Lógica de negocio, validaciones de dominio, cálculos |
| **Repository** | Acceso a datos (Sequelize), abstraído del Service |
| **Model** | Definición de tabla y asociaciones (dentro del módulo) |
| **Schema** | Schemas Zod para validación de entrada |
| **Middleware** | Auth, errores, rate-limit, validación |

## Principios

- Controllers delgados: solo reciben y responden.
- Services contienen toda la lógica de negocio.
- No confiar en datos calculados enviados por el cliente (totales, precios).
- UUID como identificador técnico de entidades sincronizables.
- Idempotencia en operaciones de sincronización.
- El backend es la fuente de verdad.

## Zona horaria

**Business timezone: `America/La_Paz` (UTC-4, sin DST).**

- Timestamps técnicos almacenados en UTC (TIMESTAMPTZ).
- Fechas de negocio (menu_date, expense_date, filtros de reportes) en America/La_Paz.
- Ver decisions/ADR-004-timezone.md.

## Organización por módulos

Los modelos Sequelize se ubican dentro de su módulo (modules/orders/order.model.ts).
La instancia Sequelize y las asociaciones están centralizadas en database/.
No se duplican modelos entre módulos.

## Flujos principales

Ver:
- docs/synchronization.md — sincronización offline
- docs/api.md — endpoints
- docs/database.md — modelo de datos
