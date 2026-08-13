/**
 * src/modules/reports/excel-export.service.ts
 *
 * Servicio de exportación de reportes a formato Excel (.xlsx) usando ExcelJS.
 *
 * Estructura del libro:
 * 1. Resumen: Periodo, total pedidos, desglose por método de pago, ventas, gastos, resultado neto.
 * 2. Pedidos: Listado de pedidos válidos (PENDING/DELIVERED), cliente, productos (snapshot x cant), total, pago, estado.
 * 3. Gastos: Listado de gastos válidos, fecha, descripción, categoría, monto, método de pago.
 * 4. Platos: Platos vendidos, cantidad total, ingresos generados (usando snapshots históricos).
 *
 * Reglas:
 * - Excluye pedidos CANCELLED y soft-deleted.
 * - Excluye gastos soft-deleted.
 * - Respeta formato numérico de moneda y fechas en America/La_Paz.
 */
import ExcelJS from 'exceljs';
import { Op, type WhereOptions } from 'sequelize';
import { Order } from '../orders/order.model';
import { OrderItem } from '../orders/order-item.model';
import { Expense } from '../expenses/expense.model';
import { ExpenseCategory } from '../expenses/expense-category.model';
import * as reportsRepo from './reports.repository';
import { customRangeUTC, toLocalDate } from '../../utils/timezone';

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CASH: 'EFECTIVO',
  QR: 'QR',
  OTHER: 'OTROS',
};

const ORDER_STATUS_MAP: Record<string, string> = {
  PENDING: 'PENDIENTE',
  DELIVERED: 'ENTREGADO',
  CANCELLED: 'CANCELADO',
};

export async function generateExcelReport(dateFrom: string, dateTo: string): Promise<Buffer> {
  const { start: startUTC, end: endUTC } = customRangeUTC(dateFrom, dateTo);

  // 1. Cargar agregados de reportes
  const salesAgg = await reportsRepo.aggregateSales(startUTC, endUTC);
  const expenseAgg = await reportsRepo.aggregateExpenses(dateFrom, dateTo);
  const topDishes = await reportsRepo.findTopDishes(startUTC, endUTC, 10000);

  // 2. Cargar pedidos detallados
  const orders = await Order.findAll({
    where: {
      orderedAt: { [Op.between]: [startUTC, endUTC] },
      status: { [Op.in]: ['PENDING', 'DELIVERED'] },
    } as WhereOptions,
    include: [
      {
        model: OrderItem,
        as: 'items',
        attributes: ['dishNameSnapshot', 'quantity', 'unitPrice', 'subtotal'],
      },
    ],
    order: [['orderedAt', 'ASC']],
  });

  // 3. Cargar gastos detallados
  const expenses = await Expense.findAll({
    where: {
      expenseDate: { [Op.between]: [dateFrom, dateTo] },
    } as WhereOptions,
    include: [
      {
        model: ExpenseCategory,
        as: 'category',
        attributes: ['name'],
      },
    ],
    order: [['expenseDate', 'ASC'], ['created_at', 'ASC']],
  });

  // 4. Crear Libro de Excel
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema Katering';
  workbook.created = new Date();

  // Estilo reutilizable de encabezados
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' }, // Gris claro profesional
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: 'FF111827' },
    size: 11,
  };

  // =========================================================================
  // HOJA 1: RESUMEN
  // =========================================================================
  const sheetResumen = workbook.addWorksheet('Resumen', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  sheetResumen.columns = [
    { header: 'Concepto', key: 'concepto', width: 25 },
    { header: 'Valor', key: 'valor', width: 30 },
  ];

  const netResult = round2(salesAgg.totalSales - expenseAgg.totalExpenses);

  const resumenRows = [
    { concepto: 'Periodo', valor: `${dateFrom} a ${dateTo}` },
    { concepto: 'Total Pedidos', valor: salesAgg.orderCount },
    { concepto: 'Ventas Efectivo', valor: salesAgg.byPaymentMethod.CASH },
    { concepto: 'Ventas QR', valor: salesAgg.byPaymentMethod.QR },
    { concepto: 'Ventas Otros', valor: salesAgg.byPaymentMethod.OTHER },
    { concepto: 'Total Ventas', valor: salesAgg.totalSales },
    { concepto: 'Total Gastos', valor: expenseAgg.totalExpenses },
    { concepto: 'Resultado Neto', valor: netResult },
  ];

  resumenRows.forEach((r) => sheetResumen.addRow(r));

  // Aplicar formato de encabezado a Fila 1
  const headerRowRes = sheetResumen.getRow(1);
  headerRowRes.font = headerFont;
  headerRowRes.fill = headerFill;

  // Formatear celdas numéricas en Resumen
  [3, 4, 5, 6, 7, 8].forEach((rowIdx) => {
    const cell = sheetResumen.getCell(`B${rowIdx}`);
    cell.numFmt = '#,##0.00 "BOB"';
    cell.alignment = { horizontal: 'right' };
  });

  // Highlight fila de resultado
  const resultRow = sheetResumen.getRow(9);
  resultRow.font = { bold: true };

  // =========================================================================
  // HOJA 2: PEDIDOS
  // =========================================================================
  const sheetPedidos = workbook.addWorksheet('Pedidos', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  sheetPedidos.columns = [
    { header: 'Fecha', key: 'fecha', width: 18 },
    { header: 'Número de Pedido', key: 'order_number', width: 18 },
    { header: 'Cliente', key: 'cliente', width: 25 },
    { header: 'Ubicación', key: 'ubicacion', width: 25 },
    { header: 'Productos', key: 'productos', width: 45 },
    { header: 'Total (BOB)', key: 'total', width: 15 },
    { header: 'Método de Pago', key: 'pago', width: 15 },
    { header: 'Estado', key: 'estado', width: 15 },
  ];

  const headerRowPed = sheetPedidos.getRow(1);
  headerRowPed.font = headerFont;
  headerRowPed.fill = headerFill;

  orders.forEach((order) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (order as any).items as OrderItem[] | undefined;
    const prodStr = items && items.length > 0
      ? items.map((i) => `${i.dishNameSnapshot} x${i.quantity}`).join(', ')
      : '-';

    const fechaStr = `${toLocalDate(order.orderedAt)} ${order.orderedAt.toISOString().substring(11, 16)}`;

    const row = sheetPedidos.addRow({
      fecha: fechaStr,
      order_number: order.orderNumber,
      cliente: order.customerName,
      ubicacion: order.locationText ?? '-',
      productos: prodStr,
      total: parseFloat(order.total),
      pago: PAYMENT_METHOD_MAP[order.paymentMethod] ?? order.paymentMethod,
      estado: ORDER_STATUS_MAP[order.status] ?? order.status,
    });

    const totalCell = row.getCell('total');
    totalCell.numFmt = '#,##0.00';
    totalCell.alignment = { horizontal: 'right' };
  });

  // =========================================================================
  // HOJA 3: GASTOS
  // =========================================================================
  const sheetGastos = workbook.addWorksheet('Gastos', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  sheetGastos.columns = [
    { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Descripción', key: 'descripcion', width: 35 },
    { header: 'Categoría', key: 'categoria', width: 20 },
    { header: 'Monto (BOB)', key: 'monto', width: 15 },
    { header: 'Método de Pago', key: 'pago', width: 15 },
  ];

  const headerRowGas = sheetGastos.getRow(1);
  headerRowGas.font = headerFont;
  headerRowGas.fill = headerFill;

  expenses.forEach((exp) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catName = (exp as any).category?.name ?? 'Sin Categoría';

    const row = sheetGastos.addRow({
      fecha: exp.expenseDate,
      descripcion: exp.description,
      categoria: catName,
      monto: parseFloat(exp.amount),
      pago: PAYMENT_METHOD_MAP[exp.paymentMethod] ?? exp.paymentMethod,
    });

    const montoCell = row.getCell('monto');
    montoCell.numFmt = '#,##0.00';
    montoCell.alignment = { horizontal: 'right' };
  });

  // =========================================================================
  // HOJA 4: PLATOS
  // =========================================================================
  const sheetPlatos = workbook.addWorksheet('Platos', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  sheetPlatos.columns = [
    { header: 'Plato', key: 'plato', width: 30 },
    { header: 'Cantidad Vendida', key: 'cantidad', width: 18 },
    { header: 'Ingresos (BOB)', key: 'ingresos', width: 18 },
  ];

  const headerRowPla = sheetPlatos.getRow(1);
  headerRowPla.font = headerFont;
  headerRowPla.fill = headerFill;

  topDishes.forEach((dish) => {
    const row = sheetPlatos.addRow({
      plato: dish.dish_name,
      cantidad: dish.total_quantity,
      ingresos: dish.total_revenue,
    });

    const cantCell = row.getCell('cantidad');
    cantCell.alignment = { horizontal: 'center' };

    const ingCell = row.getCell('ingresos');
    ingCell.numFmt = '#,##0.00';
    ingCell.alignment = { horizontal: 'right' };
  });

  // Generar Buffer binario del XLSX
  const uint8Array = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8Array);
}
