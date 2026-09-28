// @ts-check
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import { tags } from './src/utils/tags.ts';

const allowedTagValues = Object.values(tags).flat();

export default tseslint.config(
  {
    ignores: ['node_modules', 'test-results', 'playwright-report', 'downloads', 'dist', 'scripts'],
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
  }
);
