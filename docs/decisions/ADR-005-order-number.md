# ADR-005 — order_number offline-safe

## Estado: Aprobado

## Contexto

El negocio necesita un número de pedido legible (ej: 20260811-0042).
Una secuencia central requiere conexión al servidor.
Flutter puede crear pedidos offline.

## Decisión

- UUID = identificador técnico permanente (generado por cliente).
- order_number = identificador legible, asignado EXCLUSIVAMENTE por el servidor.
- order_number puede ser NULL hasta que el servidor lo asigne.

## Flujo

1. Flutter crea pedido offline con UUID. order_number = null en local.
2. Al sincronizar (push CREATE), el servidor:
   a. Asigna order_number = YYYYMMDD-XXXX (contador diario en BD).
   b. Devuelve order_number en el resultado del push.
3. Flutter actualiza su registro local con el order_number recibido.

## Formato

YYYYMMDD-XXXX donde XXXX es un contador diario con padding de 4 dígitos.
Ejemplo: 20260811-0042

El contador es responsabilidad exclusiva del servidor (sequence o tabla auxiliar).

## UI

Flutter muestra UUID truncado o "Sin número" hasta sincronizar.
Después muestra order_number definitivo.

## Consecuencias

- Funciona offline sin secuencia distribuida.
- El número es siempre único y legible.
- El UUID nunca cambia.
