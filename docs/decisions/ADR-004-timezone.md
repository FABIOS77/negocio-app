# ADR-004 — Zona horaria: America/La_Paz

## Estado: Aprobado

## Contexto

El negocio opera en Bolivia (UTC-4, sin DST).
Los pedidos y gastos deben agruparse por día de negocio, no por día UTC.
Un pedido creado a las 23:50 en La Paz no debe aparecer en el día siguiente UTC.

## Decisión

- Business timezone: America/La_Paz (UTC-4).
- Todos los TIMESTAMPTZ se almacenan en UTC.
- Las fechas de negocio (menu_date, expense_date) son tipo DATE en zona La Paz.
- Los filtros de reportes (date_from, date_to) se reciben en formato YYYY-MM-DD y el
  backend convierte a UTC con límites correctos:
  - 2026-08-01 La Paz = 2026-08-01T04:00:00Z a 2026-08-02T03:59:59Z

## Implementación

- Módulo utils/timezone.ts con helpers para conversión.
- Todas las queries de reporte usan estos helpers.

## Consecuencias

- Los reportes son correctos para el negocio.
- No hay ambigüedad en fechas cerca de medianoche.
