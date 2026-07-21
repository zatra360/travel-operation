import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...next,
  {
    // @typescript-eslint is only registered for TS files by the shared config;
    // register it here so the rule overrides resolve for every matched file.
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // The codebase uses `any` at a few typed boundaries by design.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // React 19 / compiler-era rules are advisory here, not release blockers:
      // the `setState-in-effect` data-loading pattern is used throughout.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      // Image optimization is a recommendation, not an error, for this app.
      '@next/next/no-img-element': 'warn',
    },
  },
];

export default config;
