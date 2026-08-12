/**
 * src/middlewares/validate.middleware.ts
 *
 * Middleware reutilizable para validación de requests con Zod.
 * Soporta validación de body, params y query en un solo middleware.
 *
 * Uso:
 *   router.post('/dishes', validate({ body: createDishSchema }), dishController.create)
 *   router.get('/dishes/:id', validate({ params: uuidParamSchema }), dishController.findById)
 */
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

interface RequestSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Crea un middleware de validación para los schemas provistos.
 * Los datos validados/transformados por Zod reemplazan los originales en req.
 */
export function validate(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        // Express 5 hace req.query read-only; usar Object.assign para mutarlo
        const parsed = schemas.query.parse(req.query);
        Object.assign(req.query, parsed);
      }
      if (schemas.params) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req.params = schemas.params.parse(req.params) as any;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Validation failed', err.issues));
      } else {
        next(err);
      }
    }
  };
}
