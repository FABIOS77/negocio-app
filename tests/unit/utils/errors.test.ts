/**
 * tests/unit/utils/errors.test.ts
 *
 * Tests unitarios para la jerarquía de errores de dominio.
 * Verifica statusCodes, codes y herencia de AppError.
 */
import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from '../../../src/utils/errors';

describe('AppError', () => {
  it('should create an error with statusCode, code and message', () => {
    const err = new AppError(400, 'TEST_CODE', 'test message');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
    expect(err).toBeInstanceOf(Error);
  });

  it('should be identified as AppError instance', () => {
    const err = new ValidationError('invalid');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('ValidationError', () => {
  it('should have statusCode 400 and VALIDATION_ERROR code', () => {
    const err = new ValidationError('Validation failed');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('should accept optional details', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const err = new ValidationError('Validation failed', details);
    expect(err.details).toEqual(details);
  });

  it('should work without details', () => {
    const err = new ValidationError('Validation failed');
    expect(err.details).toBeUndefined();
  });
});

describe('AuthenticationError', () => {
  it('should have statusCode 401 and AUTHENTICATION_ERROR code', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should accept custom message', () => {
    const err = new AuthenticationError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('AuthorizationError', () => {
  it('should have statusCode 403 and AUTHORIZATION_ERROR code', () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('AUTHORIZATION_ERROR');
  });
});

describe('NotFoundError', () => {
  it('should have statusCode 404 and NOT_FOUND code', () => {
    const err = new NotFoundError('Order');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toContain('Order');
  });
});

describe('ConflictError', () => {
  it('should have statusCode 409 and CONFLICT code', () => {
    const err = new ConflictError('Email already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });
});

describe('BusinessRuleError', () => {
  it('should have statusCode 422 and BUSINESS_RULE_VIOLATION code', () => {
    const err = new BusinessRuleError('Dish is inactive');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('BUSINESS_RULE_VIOLATION');
  });
});
