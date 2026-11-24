// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const COLOR_LITERAL_RULE = [
  'error',
  {
    selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
    message: 'Use a colour token from @packages/ui/theme instead of a hex literal.',
  },
  {
    selector: 'Literal[value=/^rgba?\\(/]',
    message: 'Use a colour token from @packages/ui/theme instead of an rgb(a) literal.',
  },
];

module.exports = defineConfig([
  globalIgnores(['node_modules/*', '.expo/*', 'dist/*', 'docs/*', 'scripts/*']),
  expoConfig,
  {
    files: ['src/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': COLOR_LITERAL_RULE },
  },
  {
    files: ['packages/ui/src/theme/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['packages/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*', '@/**', '**/src/app/**', '**/src/screens/**', '**/src/services/**', '**/src/constants/**'],
              message: 'Packages must not import app code from src/.',
            },
          ],
        },
      ],
    },
  },
]);
