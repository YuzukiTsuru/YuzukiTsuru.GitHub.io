import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'public/**',
      'themes/endspace/source/js/vendor/**',
      '**/*.min.js',
      'db.json'
    ]
  },
  // Hexo helper scripts - Node.js ES6 environment
  {
    files: ['themes/endspace/scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly'
      }
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
      'no-var': 'warn',
      'camelcase': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  // Frontend JavaScript - ES5 browser environment
  {
    files: ['themes/endspace/source/js/*.js'],
    ignores: ['themes/endspace/source/js/vendor/**', '**/*.min.js'],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        XMLHttpRequest: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        addEventListener: 'readonly',
        removeEventListener: 'readonly',
        querySelector: 'readonly',
        querySelectorAll: 'readonly',
        getElementById: 'readonly',
        getElementsByClassName: 'readonly'
      }
    },
    rules: {
      'no-var': 'off',
      'prefer-const': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'comma-dangle': ['warn', 'never'],
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  }
];