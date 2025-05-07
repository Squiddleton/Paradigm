import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsdoc from 'eslint-plugin-tsdoc';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		files: [
			'src/**/*.ts',
			'eslint.config.js'
		],
		extends: [
			eslint.configs.recommended,
			stylistic.configs.recommended,
			tseslint.configs.strictTypeChecked,
			tseslint.configs.stylisticTypeChecked
		],
		languageOptions: {
			parserOptions: {
				project: [
					'./tsconfig.json'
				]
			}
		},
		plugins: {
			'@stylistic': stylistic,
			tsdoc
		},
		rules: {
		// 'sort-imports': 'error',
			'@stylistic/arrow-parens': ['error', 'as-needed'],
			'@stylistic/block-spacing': 'error',
			'@stylistic/comma-dangle': ['error', 'never'],
			'@stylistic/eol-last': ['error', 'never'],
			'@stylistic/indent': ['error', 'tab'],
			'@stylistic/jsx-closing-tag-location': 'off',
			'@stylistic/jsx-indent': ['error', 'tab'],
			'@stylistic/jsx-one-expression-per-line': ['error', { allow: 'single-line' }],
			'@stylistic/jsx-quotes': ['error', 'prefer-single'],
			'@stylistic/jsx-wrap-multilines': 'off',
			'@stylistic/max-statements-per-line': 'error',
			'@stylistic/member-delimiter-style': ['error', { multiline: { delimiter: 'semi' } }],
			'@stylistic/no-tabs': 'off',
			'@stylistic/quotes': ['error', 'single'],
			'@stylistic/semi': ['error', 'always'],
			'tsdoc/syntax': 'error',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					fixStyle: 'inline-type-imports'
				}
			],
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					checksVoidReturn: false
				}
			],
			'@typescript-eslint/no-namespace': 'off',
			'@typescript-eslint/no-unsafe-enum-comparison': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off'
		}
	},
	{
		ignores: [
			'dist/*'
		]
	}
);