/**
 * tests/unit/utils/response.test.ts
 *
 * Tests unitarios para los helpers de respuesta API.
 * Verifica el formato consistente { success, data } / { success, error }.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import {
  sendSuccess,
  sendError,
  sendPaginated,
  buildPagination,
} from '../../../src/utils/response';

/** Crea un mock mínimo de Express Response */
function mockResponse(): { res: Response; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  return { res, json, status };
}

describe('sendSuccess', () => {
  it('should send a success response with status 200 by default', () => {
    const { res, status, json } = mockResponse();
    sendSuccess(res, { id: '123', name: 'Test' });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ success: true, data: { id: '123', name: 'Test' } });
  });

  it('should send a success response with custom status code', () => {
    const { res, status } = mockResponse();
    sendSuccess(res, { id: '1' }, 201);
    expect(status).toHaveBeenCalledWith(201);
  });

  it('should handle null data', () => {
    const { res, json } = mockResponse();
    sendSuccess(res, null);
    expect(json).toHaveBeenCalledWith({ success: true, data: null });
  });
});

describe('sendError', () => {
  it('should send an error response with default status 500', () => {
    const { res, status, json } = mockResponse();
    sendError(res, 'INTERNAL_ERROR', 'Something went wrong');
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  });

  it('should include details when provided', () => {
    const { res, json } = mockResponse();
    const details = [{ field: 'email' }];
    sendError(res, 'VALIDATION_ERROR', 'Invalid', 400, details);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid', details },
    });
  });

  it('should NOT include details key when details is undefined', () => {
    const { res, json } = mockResponse();
    sendError(res, 'NOT_FOUND', 'Not found', 404);
    const call = (json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.error).not.toHaveProperty('details');
  });
});

describe('buildPagination', () => {
  it('should calculate totalPages correctly', () => {
    const meta = buildPagination(100, 1, 20);
    expect(meta).toEqual({ total: 100, page: 1, limit: 20, totalPages: 5 });
  });

  it('should handle partial last page', () => {
    const meta = buildPagination(101, 1, 20);
    expect(meta.totalPages).toBe(6);
  });

  it('should handle empty result', () => {
    const meta = buildPagination(0, 1, 20);
    expect(meta.totalPages).toBe(0);
  });
});

describe('sendPaginated', () => {
  it('should send a paginated response', () => {
    const { res, status, json } = mockResponse();
    const data = [{ id: '1' }, { id: '2' }];
    const pagination = buildPagination(2, 1, 10);
    sendPaginated(res, data, pagination);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ success: true, data, pagination });
  });
});
