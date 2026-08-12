# ADR-002 — Refresh Tokens en tabla separada

## Estado: Aprobado

## Contexto

El access token JWT dura 15 minutos. Sin refresh, el usuario debe re-autenticarse frecuentemente,
lo que es impractical en una app offline.

## Decisión

Implementar refresh tokens de 30 días almacenados en tabla refresh_tokens.
El token real nunca se almacena: solo SHA-256(token).

## Tabla refresh_tokens

- id, user_id, token_hash, expires_at, revoked_at, created_at, updated_at.
- Permite múltiples sesiones por usuario (varios dispositivos simultáneos).
- Logout revoca el token correspondiente (SET revoked_at = NOW()).

## Consecuencias

- Mayor seguridad: tokens revocables.
- Soporte multi-dispositivo.
- Complejidad mínima adicional (una tabla).
