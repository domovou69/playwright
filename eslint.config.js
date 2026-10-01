// @ts-check
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import { tags } from './src/utils/tags.ts';

const allowedTagValues = Object.values(tags).flat();

export default defineConfig(
  {
    ignores: ['node_modules', 'test-results', 'playwright-report', 'downloads', 'dist'],
  },
  {
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  playwright.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'playwright/missing-playwright-await': 'error',
      // Page-object methods carry the actual expect()/throw calls, not the test body itself.
      'playwright/expect-expect': ['warn', { assertFunctionPatterns: ['^validate', '^download', '^search$'] }],
      // allowedTags schema also accepts `{ source }` objects for regex, but the rule only
      // checks `instanceof RegExp` at runtime - a plain object silently never matches.
      'playwright/valid-test-tags': ['error', { allowedTags: [...allowedTagValues, /^@[A-Z]+-\d+$/] }],
      'playwright/require-tags': 'error',
    },
  },
  // Area folders created after wallpapers (pages/<area>/, tests/<area>/). Wallpapers predates these rules and is left alone.
  {
    files: ['tests/*/**/*.ts'],
    ignores: ['tests/wallpapers/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // app.page, app.page.component, app.page.component.locator (also as a destructuring source)
          selector:
            'VariableDeclarator[init.name="app"], VariableDeclarator[init.object.name="app"], VariableDeclarator[init.object.object.name="app"], VariableDeclarator[init.object.object.object.name="app"]',
          message: 'Call page objects explicitly (app.<page>.<component>.<member>); an alias hides the assertions that belong in a validate* method.',
        },
        {
          // A callee (app.page.locator.first) is a page-level locator plus a method, so only a plain app.page.component.x is flagged.
          selector:
            'CallExpression[callee.name="expect"] MemberExpression[object.object.object.name="app"]:not(CallExpression > MemberExpression.callee)',
          message: 'Do not assert on a component locator in a test: add or reuse a validate* method on the component (with options for variants).',
        },
      ],
    },
  },
  {
    files: ['pages/*/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'IfStatement > ReturnStatement.consequent, IfStatement > BlockStatement.consequent > ReturnStatement',
          message:
            'An early-return guard makes the check silently do nothing in another state: assert the expected state, pick the branch from data.',
        },
      ],
    },
  }
);
