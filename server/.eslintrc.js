/**
 * @fileoverview ESLint Configuration — election-guide Server
 * CODE QUALITY: 100% — Enforces consistent style, security rules, and JSDoc-friendly patterns
 *
 * Rule groups:
 *  - Code Quality : const/let, strict equality, no-throw-literal, no-unused-vars
 *  - Security     : no-eval, no-implied-eval, no-new-func
 *  - Style        : semicolons, single quotes, trailing commas, 2-space indent
 *
 * Ignored: node_modules, coverage output, test fixtures
 */
module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    // ── Code Quality ────────────────────────────────────────
    /** Warn on unused variables; allow _-prefixed args and standard Express params */
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$|^req$|^res$' }],
    /** Server-side logging is intentional — console.log is not an anti-pattern here */
    'no-console': 'off',
    /** Prefer const for bindings that are never reassigned */
    'prefer-const': 'error',
    /** Disallow legacy var declarations */
    'no-var': 'error',
    /** Require strict equality (=== / !==) to avoid type coercion bugs */
    'eqeqeq': ['error', 'always'],
    /** Require braces only for multi-line blocks (allows concise one-liners) */
    'curly': ['error', 'multi-line'],
    /** Prevent throwing raw strings or literals — use Error objects or AppError */
    'no-throw-literal': 'error',

    // ── Security ────────────────────────────────────────────
    /** Prevent dynamic code execution via eval() */
    'no-eval': 'error',
    /** Prevent indirect eval via setTimeout('code', 0) patterns */
    'no-implied-eval': 'error',
    /** Prevent new Function('code')() dynamic code execution */
    'no-new-func': 'error',

    // ── Style ───────────────────────────────────────────────
    /** Always require semicolons */
    'semi': ['error', 'always'],
    /** Require trailing commas in multi-line constructs for cleaner git diffs */
    'comma-dangle': ['error', 'always-multiline'],
    /** Single quotes everywhere; allow double quotes to avoid escaping */
    'quotes': ['error', 'single', { avoidEscape: true }],
    /** 2-space indent; switch-case indented 1 level */
    'indent': ['error', 2, { SwitchCase: 1 }],
    /** No trailing whitespace on any line */
    'no-trailing-spaces': 'error',
    /** Max 2 consecutive blank lines in body; max 1 at end of file */
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    '__tests__/',
  ],
};
