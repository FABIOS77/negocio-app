/**
 * tests/integration/health.test.ts
 *
 * Test de integración del health check endpoint.
 * Importa el app de Express directamente (sin iniciar el servidor HTTP ni la BD).
 * El health check no requiere conexión a base de datos.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('GET /health', () => {
  it('should return 200 with success status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });

  it('should return JSON content type', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('Unknown routes', () => {
  it('should return 404 for unknown GET routes', async () => {
    const response = await request(app).get('/api/v1/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 404 for unknown POST routes', async () => {
    const response = await request(app).post('/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
