/**
 * src/modules/reports/reports.service.ts
 *
 * Servicio de reportes — Sprint 3 implementa solo producción.
 * Los reportes completos (ventas, gastos, resultado) se implementarán posteriormente.
 */
import * as ordersRepo from '../orders/orders.repository';
import { dateRangeUTC } from '../../utils/timezone';
import type { ProductionQueryInput } from '../orders/orders.schema';

export interface ProductionItemDTO {
  dish_id: string;
  dish_name: string;
  total_quantity: number;
}

/**
 * Resumen de producción para un día.
 *
 * Reglas:
 * - La fecha se interpreta en America/La_Paz (UTC-4).
 * - Se excluyen pedidos CANCELLED.
 * - Se agrupan los order_items por dish, sumando quantities.
 * - Se ordena por cantidad descendente.
 */
export async function getProductionSummary(
  query: ProductionQueryInput,
): Promise<ProductionItemDTO[]> {
  const { start, end } = dateRangeUTC(query.date);
  return ordersRepo.findProductionSummary(start, end);
}
