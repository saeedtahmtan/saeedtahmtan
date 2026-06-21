<script lang="ts">
	import MatrixGrid from '$lib/MatrixGrid.svelte';
	import NavBar from '$lib/NavBar.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
</script>

<div class="h-screen">
	<MatrixGrid />
</div>

<NavBar />

<section
	class="relative container mx-auto flex min-h-screen flex-col gap-6 bg-background px-8 py-16"
>
	<Card class="scroll-mt-16" id="about">
		<CardHeader>
			<CardTitle>About Me</CardTitle>
		</CardHeader>
		<CardContent>
			Full-stack developer passionate about building interactive web experiences.
		</CardContent>
	</Card>
	<Card class="scroll-mt-16" id="projects">
		<CardHeader>
			<CardTitle>Projects</CardTitle>
		</CardHeader>
		<CardContent>A collection of open-source tools, games, and experiments.</CardContent>
	</Card>
	<Card class="scroll-mt-16" id="skills">
		<CardHeader>
			<CardTitle>Skills</CardTitle>
		</CardHeader>
		<CardContent>TypeScript, Svelte, React, Rust, Go, and more.</CardContent>
	</Card>
	<Card class="scroll-mt-16" id="contact">
		<CardHeader>
			<CardTitle>Contact</CardTitle>
		</CardHeader>
		<CardContent>Feel free to reach out — I'm always open to new ideas.</CardContent>
	</Card>
</section>
