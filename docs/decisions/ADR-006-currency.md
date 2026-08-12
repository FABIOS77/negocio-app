# ADR-006 — Moneda: BOB, DECIMAL(10,2)

## Estado: Aprobado

## Contexto

Todas las cantidades monetarias deben ser exactas.
Usar float/double puede causar errores de redondeo en cálculos financieros.

## Decisión

- Moneda de V1: BOB (bolivianos).
- Todas las columnas monetarias usan DECIMAL(10,2) en PostgreSQL.
- No se usa float ni double en ninguna columna monetaria.
- Los cálculos en JavaScript/TypeScript usan la librería decimal.js o se realizan en
  enteros de centavos cuando sea necesario, para evitar errores de punto flotante.

## Consecuencias

- Exactitud en todos los cálculos financieros.
- Los reportes son confiables.
- Si en el futuro se agregan otras monedas, se agregará un campo currency a las entidades relevantes.
