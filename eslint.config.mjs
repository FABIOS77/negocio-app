import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Paths globalmente ignorados
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/database/migrations/**',
      'src/database/seeders/**',
      '*.js',
      '*.mjs',
      '*.cjs',
    ],
  },
  // Reglas base JS
  eslint.configs.recommended,
  // Reglas TypeScript
  ...tseslint.configs.recommended,
  // Desactiva reglas de ESLint que conflictúan con Prettier
  prettier,
  // Reglas personalizadas del proyecto
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
);
