# Database

## Consideraciones generales

- Moneda: DECIMAL(10,2) en BOB. No usar float/double.
- Timestamps técnicos: TIMESTAMPTZ (UTC).
- Fechas de negocio: DATE (interpretadas en America/La_Paz).
- Soft delete: deleted_at TIMESTAMPTZ nullable.
- Control de versión: campo version INTEGER en entidades sincronizables.

## Entidades y tablas

### users
| Columna | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(150) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| active | BOOLEAN | NOT NULL, DEFAULT true |
| version | INTEGER | NOT NULL, DEFAULT 1 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

### refresh_tokens
| Columna | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users.id |
| token_hash | VARCHAR(255) | NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| revoked_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

El token real no se almacena. Solo SHA-256(token).

### dishes
| Columna | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(200) | NOT NULL |
| description | TEXT | nullable |
| price | DECIMAL(10,2) | NOT NULL, CHECK > 0 |
| image_url | VARCHAR(500) | nullable |
| active | BOOLEAN | NOT NULL, DEFAULT true |
| version | INTEGER | NOT NULL, DEFAULT 1 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | nullable |

### daily_menus
| Columna | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| menu_date | DATE | NOT NULL, UNIQUE |
| active | BOOLEAN | NOT NULL, DEFAULT true |
| version | INTEGER | NOT NULL, DEFAULT 1 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

### daily_menu_dishes
| Columna | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| daily_menu_id | UUID | FK daily_menus.id |
| dish_id | UUID | FK dishes.id |

UNIQUE(daily_menu_id, dish_id)

### orders
| Columna | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| order_number | VARCHAR(30) | UNIQUE, nullable |
| customer_name | VARCHAR(200) | NOT NULL |
| location_text | VARCHAR(300) | nullable |
| total | DECIMAL(10,2) | NOT NULL, CHECK >= 0 |
| payment_method | VARCHAR(20) | CHECK IN ('CASH','QR','OTHER') |
| status | VARCHAR(20) | CHECK IN ('PENDING','DELIVERED','CANCELLED') |
| ordered_at | TIMESTAMPTZ | NOT NULL |
| created_by | UUID | FK users.id |
| version | INTEGER | NOT NULL, DEFAULT 1 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | nullable (solo sync interno) |

Transiciones: PENDING→DELIVERED, PENDING→CANCELLED (estados terminales).
No existe DELETE en flujo de negocio: CANCELLED es el estado de cierre.

Notas de implementación (Sprint 3):
- id = UUID generado por el cliente (offline-first). El servidor no genera el id.
- order_number = asignado exclusivamente por el servidor (formato YYYYMMDD-NNNN).
  Puede ser NULL si el pedido fue creado offline y aún no sincronizó.
- El UNIQUE sobre order_number es sparse (WHERE order_number IS NOT NULL).
- La idempotencia se garantiza por el PK UUID: mismo UUID = mismo pedido. Ver ADR-007.
- deleted_at reservado para uso interno/sync; el flujo de negocio no expone DELETE.

### order_items
| Columna | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| order_id | UUID | FK orders.id |
| dish_id | UUID | FK dishes.id |
| dish_name_snapshot | VARCHAR(200) | NOT NULL |
| quantity | INTEGER | NOT NULL, CHECK > 0 |
| unit_price | DECIMAL(10,2) | NOT NULL, CHECK > 0 |
| subtotal | DECIMAL(10,2) | NOT NULL |

UNIQUE(order_id, dish_id) — un mismo plato no puede repetirse en el mismo pedido.

Notas de implementación (Sprint 3):
- unit_price es un snapshot del precio al momento de creación. Nunca se recalcula.
- dish_name_snapshot es un snapshot del nombre al momento de creación.
- El backend NUNCA acepta unit_price del cliente; lo obtiene desde dishes.price.
- subtotal = round2(unit_price * quantity), calculado en backend.
- Ver ADR-006 para el manejo de valores monetarios.

### expense_categories
| Columna | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| active | BOOLEAN | NOT NULL, DEFAULT true |
| version | INTEGER | NOT NULL, DEFAULT 1 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Notas de implementación (Sprint 4):
- name es único y obligatorio.
- Si una categoría posee gastos históricos asociados, el endpoint DELETE conmuta `active: false` en lugar de borrar físicamente.

### expenses
| Columna | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| description | TEXT | NOT NULL |
| amount | DECIMAL(10,2) | NOT NULL, CHECK > 0 |
| category_id | UUID | FK expense_categories.id |
| payment_method | VARCHAR(20) | CHECK IN ('CASH','QR','OTHER') |
| expense_date | DATE | NOT NULL (YYYY-MM-DD) |
| created_by | UUID | FK users.id |
| version | INTEGER | NOT NULL, DEFAULT 1 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | nullable (soft delete) |

Notas de implementación (Sprint 4):
- id puede ser provisto por el cliente para idempotencia offline (mismo UUID = HTTP 200).
- amount es DECIMAL(10,2) > 0.
- category_id debe referenciar una categoría existente y activa (active: true).
- deleted_at para soft delete (no aparece en listados ni reportes).

### sync_operations
| Columna | Tipo | Constraints |
|---|---|---|
| operation_id | UUID | PK (idempotency key) |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | UUID | NOT NULL |
| operation | VARCHAR(10) | CHECK IN ('CREATE','UPDATE','DELETE') |
| payload | JSONB | NOT NULL |
| entity_version | INTEGER | NOT NULL |
| client_timestamp | TIMESTAMPTZ | NOT NULL |
| processed_at | TIMESTAMPTZ | nullable |
| status | VARCHAR(20) | CHECK IN ('PENDING','PROCESSED','FAILED') |
| error_message | TEXT | nullable |
| processed_by | UUID | FK users.id |

### change_log
| Columna | Tipo | Constraints |
|---|---|---|
| id | BIGSERIAL | PK (cursor incremental) |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | UUID | NOT NULL |
| operation | VARCHAR(10) | CHECK IN ('CREATE','UPDATE','DELETE') |
| snapshot | JSONB | NOT NULL |
| changed_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| changed_by | UUID | FK users.id |

## Indices principales

- idx_users_email (unique)
- idx_refresh_tokens_user_id, idx_refresh_tokens_token_hash
- idx_dishes_active
- idx_daily_menus_date (unique)
- idx_orders_ordered_at, idx_orders_status, idx_orders_created_by
- idx_orders_order_number (unique sparse: WHERE order_number IS NOT NULL)
- idx_order_items_order_dish_unique (unique: order_id, dish_id)
- idx_order_items_order_id, idx_order_items_dish_id
- idx_expenses_expense_date, idx_expenses_category_id
- idx_change_log_entity_type, idx_change_log_id (pk, ya indexado)
