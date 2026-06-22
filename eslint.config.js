import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    // Not linted here: build output, deps, Deno edge functions (CI runs
    // `deno check` on those), generated/pasted imports, and config files.
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'supabase/functions',
      'src/imports/**',
      '*.config.{js,ts,mjs,cjs}',
      'public',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Rules of Hooks are real bugs — keep them as errors.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // The codebase intentionally uses `as any` / `as never` for typed
      // supabase RPC calls (see CLAUDE.md), so don't hard-fail on `any`.
      '@typescript-eslint/no-explicit-any': 'off',
      // Unused identifiers are worth flagging but shouldn't block the build;
      // allow `_`-prefixed throwaways.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // Test files run under Vitest globals + node.
    files: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },
);
