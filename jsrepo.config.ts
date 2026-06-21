import { defineConfig } from 'jsrepo';

export default defineConfig({
	registries: [
		{
			name: 'shadcn-svelte-extras',
			type: 'registry',
			url: 'https://shadcn-svelte-extras.com'
		}
	],
	paths: {
		ui: '$lib/components/ui',
		component: '$lib/components',
		hook: '$lib/hooks',
		action: '$lib/actions',
		util: '$lib/utils',
		lib: '$lib'
	}
});