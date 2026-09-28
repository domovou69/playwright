// @ts-check
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

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
    },
  }
);
