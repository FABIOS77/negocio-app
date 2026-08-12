/**
 * src/modules/expenses/expenses.routes.ts
 *
 * Rutas del módulo de gastos y categorías de gastos.
 * Protegidas con requireAuth.
 *
 * Endpoints:
 *   GET    /api/v1/expenses/categories
 *   POST   /api/v1/expenses/categories
 *   PATCH  /api/v1/expenses/categories/:id
 *   DELETE /api/v1/expenses/categories/:id
 *
 *   GET    /api/v1/expenses
 *   POST   /api/v1/expenses
 *   GET    /api/v1/expenses/:id
 *   PUT    /api/v1/expenses/:id
 *   DELETE /api/v1/expenses/:id
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createCategorySchema,
  updateCategorySchema,
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
  uuidParamSchema,
} from './expenses.schema';
import * as categoriesController from './expense-categories.controller';
import * as expensesController from './expenses.controller';

const router = Router();

router.use(requireAuth);

// ─── Categorías ───────────────────────────────────────────────────────────────

router.get('/categories', categoriesController.listCategories);
router.post('/categories', validate({ body: createCategorySchema }), categoriesController.createCategory);
router.patch(
  '/categories/:id',
  validate({ params: uuidParamSchema, body: updateCategorySchema }),
  categoriesController.updateCategory,
);
router.delete(
  '/categories/:id',
  validate({ params: uuidParamSchema }),
  categoriesController.deleteCategory,
);

// ─── Gastos ───────────────────────────────────────────────────────────────────

router.get('/', validate({ query: expenseQuerySchema }), expensesController.listExpenses);
router.post('/', validate({ body: createExpenseSchema }), expensesController.createExpense);
router.get('/:id', validate({ params: uuidParamSchema }), expensesController.getExpense);
router.put(
  '/:id',
  validate({ params: uuidParamSchema, body: updateExpenseSchema }),
  expensesController.updateExpense,
);
router.delete('/:id', validate({ params: uuidParamSchema }), expensesController.deleteExpense);

export default router;
