/**
 * src/modules/reports/reports.service.ts
 *
 * Servicio de reportes financieros y operativos.
 *
 * Reglas:
 * - Fechas interpretadas en America/La_Paz.
 * - Sales Report / Financial Result / Top Dishes incluyen PENDING y DELIVERED, excluyen CANCELLED.
 * - Excluyen registros soft-deleted.
 * - Redondeo a 2 decimales para evitar imprecisión de punto flotante en JavaScript.
 */
import * as ordersRepo from '../orders/orders.repository';
import * as reportsRepo from './reports.repository';
import { dateRangeUTC, resolvePeriod } from '../../utils/timezone';
import type { ReportQueryInput, TopDishesQueryInput, ProductionQueryInput } from './reports.schema';

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

export interface SalesReportDTO {
  total_sales: number;
  order_count: number;
  by_payment_method: {
    CASH: number;
    QR: number;
    OTHER: number;
  };
  period: {
    period_type: string;
    date_from: string;
    date_to: string;
  };
}

export interface ExpenseReportDTO {
  total_expenses: number;
  expense_count: number;
  by_category: Array<{
    category_id: string;
    category_name: string;
    total_amount: number;
  }>;
  by_payment_method: {
    CASH: number;
    QR: number;
    OTHER: number;
  };
  period: {
    period_type: string;
    date_from: string;
    date_to: string;
  };
}

export interface FinancialResultDTO {
  total_sales: number;
  total_expenses: number;
  result: number;
  period: {
    period_type: string;
    date_from: string;
    date_to: string;
  };
}

export interface TopDishDTO {
  dish_id: string;
  dish_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface ProductionItemDTO {
  dish_id: string;
  dish_name: string;
  total_quantity: number;
}

/**
 * Reporte de Ventas.
 */
export async function getSalesReport(query: ReportQueryInput): Promise<SalesReportDTO> {
  const periodInfo = resolvePeriod(query.period, query.date_from, query.date_to);

  const aggregate = await reportsRepo.aggregateSales(periodInfo.startUTC, periodInfo.endUTC);

  return {
    total_sales: aggregate.totalSales,
    order_count: aggregate.orderCount,
    by_payment_method: aggregate.byPaymentMethod,
    period: {
      period_type: periodInfo.periodType,
      date_from: periodInfo.dateFrom,
      date_to: periodInfo.dateTo,
    },
  };
}

/**
 * Reporte de Gastos.
 */
export async function getExpenseReport(query: ReportQueryInput): Promise<ExpenseReportDTO> {
  const periodInfo = resolvePeriod(query.period, query.date_from, query.date_to);

  const aggregate = await reportsRepo.aggregateExpenses(periodInfo.dateFrom, periodInfo.dateTo);

  return {
    total_expenses: aggregate.totalExpenses,
    expense_count: aggregate.expenseCount,
    by_category: aggregate.byCategory,
    by_payment_method: aggregate.byPaymentMethod,
    period: {
      period_type: periodInfo.periodType,
      date_from: periodInfo.dateFrom,
      date_to: periodInfo.dateTo,
    },
  };
}

/**
 * Resultado Financiero (Ventas - Gastos).
 */
export async function getFinancialResult(query: ReportQueryInput): Promise<FinancialResultDTO> {
  const periodInfo = resolvePeriod(query.period, query.date_from, query.date_to);

  const salesAgg = await reportsRepo.aggregateSales(periodInfo.startUTC, periodInfo.endUTC);
  const expenseAgg = await reportsRepo.aggregateExpenses(periodInfo.dateFrom, periodInfo.dateTo);

  const totalSales = salesAgg.totalSales;
  const totalExpenses = expenseAgg.totalExpenses;
  const result = round2(totalSales - totalExpenses);

  return {
    total_sales: totalSales,
    total_expenses: totalExpenses,
    result,
    period: {
      period_type: periodInfo.periodType,
      date_from: periodInfo.dateFrom,
      date_to: periodInfo.dateTo,
    },
  };
}

/**
 * Platos más vendidos.
 */
export async function getTopDishes(query: TopDishesQueryInput): Promise<TopDishDTO[]> {
  const periodInfo = resolvePeriod(query.period, query.date_from, query.date_to);
  const limit = query.limit ?? 10;

  return reportsRepo.findTopDishes(periodInfo.startUTC, periodInfo.endUTC, limit);
}

/**
 * Resumen de Producción (mantenido de Sprint 3).
 */
export async function getProductionSummary(
  query: ProductionQueryInput,
): Promise<ProductionItemDTO[]> {
  const { start, end } = dateRangeUTC(query.date);
  return ordersRepo.findProductionSummary(start, end);
}
