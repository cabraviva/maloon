import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import autoPreprocess from 'svelte-preprocess'
import typescript from '@rollup/plugin-typescript';

export default {
	input: 'src/index.ts',
	output: [
		{ file: 'dist/index.es', 'format': 'es' }
	],
	plugins: [
		svelte({
			preprocess: autoPreprocess()
		}),
		typescript({
			declaration: true,
			outDir: 'dist'
		}),
		resolve()
	]
};
