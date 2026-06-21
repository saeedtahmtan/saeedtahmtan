<script lang="ts">
	import { onMount } from 'svelte';
	import { mode } from 'mode-watcher';
	import figlet from 'figlet';
	import POISON_FONT from './fonts/Poison.flf?raw';

	figlet.parseFont('Poison', POISON_FONT);

	const chars =
		'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const COLORS = [
		'#ad123d',
		'#b94b08',
		'#c58d0f',
		'#34952d',
		'#289381',
		'#1b8b9f',
		'#084cba',
		'#031fd6',
		'#6011bd',
		'#bd1f91'
	];

	let canvasEl: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let cols: number;
	let rows: number;
	let grid: number[];
	let textMap: Map<string, { ch: string }> | null = null;
	let lastArt: string | null = null;
	let mouseCol = -1;
	let mouseRow = -1;
	let frameCount = 0;
	let resizeTimer: ReturnType<typeof setTimeout> | undefined;
	let animating = true;
	let rafId: number;
	let cssW: number;
	let cssH: number;

	let {
		fontName = 'Poison',
		gliderCount = 4
	}: {
		fontName?: string;
		gliderCount?: number;
	} = $props();

	let isDark = $derived(mode.current === 'dark');

	let clickMeMap: Map<string, { ch: string; isCursor?: boolean }>;
	let clickMeCursorVisible = true;
	let textContentWidth = 0;

	const fontSize = 14;
	const gap = 2;
	let charWidth: number;
	let charHeight: number;

	const gliders: number[][][] = [
		[
			[1, 0],
			[2, 1],
			[0, 2],
			[1, 2],
			[2, 2]
		],
		[
			[0, 0],
			[1, 0],
			[2, 0],
			[2, 1],
			[1, 2]
		],
		[
			[0, 0],
			[1, 0],
			[2, 0],
			[0, 1],
			[1, 2]
		],
		[
			[1, 0],
			[0, 1],
			[0, 2],
			[1, 2],
			[2, 2]
		]
	];

	function pseudo(s: number): number {
		let h = (s ^ (s >>> 13)) * 0x45d9f3b;
		h = (h ^ (h >>> 7)) * 0x27d4eb2d;
		return (h ^ (h >>> 17)) >>> 0;
	}

	function rebuildTextMap() {
		if (!lastArt) return;
		const lines = lastArt.split('\n');
		const h = lines.length;

		let minFirst = Infinity;
		let maxLast = -1;
		for (const line of lines) {
			let first = -1,
				last = -1;
			for (let i = 0; i < line.length; i++) {
				if (line[i] !== ' ') {
					if (first === -1) first = i;
					last = i;
				}
			}
			if (first !== -1) {
				if (first < minFirst) minFirst = first;
				if (last > maxLast) maxLast = last;
			}
		}
		if (minFirst === Infinity) return;

		const contentWidth = maxLast - minFirst + 1;
		textContentWidth = contentWidth;
		const map = new Map<string, { ch: string }>();
		for (let row = 0; row < h; row++) {
			for (let col = minFirst; col <= maxLast; col++) {
				const ch = lines[row][col];
				if (ch !== ' ') {
					const r = (((Math.floor(rows / 2) - Math.floor(h / 2) + row) % rows) + rows) % rows;
					const c =
						(((Math.floor(cols / 2) - Math.floor(contentWidth / 2) + (col - minFirst)) % cols) +
							cols) %
						cols;
					const key = r + ',' + c;
					if (!map.has(key)) {
						map.set(key, { ch });
					}
				}
			}
		}
		textMap = map;
	}

	function renderFiglet(art: string) {
		lastArt = art;
		rebuildTextMap();
	}

	function autoRender() {
		const w = window.innerWidth;
		let t: string;
		if (w > 1160) t = 'saeed\ntahmtan';
		else if (w > 830) t = 'saeed';
		else t = 's\nt';
		try {
			const art = figlet.textSync(t, { font: fontName });
			renderFiglet(art);
		} catch (err) {
			console.error('figlet error:', err);
		}
	}

	function init(w: number, h: number) {
		const dpr = window.devicePixelRatio || 1;

		cssW = w;
		cssH = h;
		cols = Math.ceil(w / charWidth);
		rows = Math.ceil(h / charHeight);

		canvasEl.width = w * dpr;
		canvasEl.height = h * dpr;
		ctx = canvasEl.getContext('2d')!;
		ctx.scale(dpr, dpr);
		ctx.font = `bold ${fontSize}px "Zed Mono", monospace`;
		ctx.textBaseline = 'top';

		grid = new Array(cols * rows);
		for (let i = 0; i < grid.length; i++) grid[i] = 0;

		if (textMap) rebuildTextMap();
		autoRender();

		if (textContentWidth > 0 && cols % 2 !== textContentWidth % 2) {
			cols += 1;
			grid = new Array(cols * rows);
			for (let i = 0; i < grid.length; i++) grid[i] = 0;
			if (lastArt) rebuildTextMap();
		}

		initClickMe();
	}

	function initClickMe() {
		const text = 'CLICK ME!';
		const startCol = Math.floor((cols - text.length) / 2);
		const row = rows - 8;
		const map = new Map<string, { ch: string; isCursor?: boolean }>();
		for (let i = 0; i < text.length; i++) {
			map.set(row + ',' + (startCol + i), { ch: text[i] });
		}
		map.set(row + ',' + (startCol + text.length), { ch: '_', isCursor: true });
		clickMeMap = map;
	}

	function stepGoL() {
		const next = new Array(cols * rows);
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				let neighbors = 0;
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (dx === 0 && dy === 0) continue;
						neighbors += grid[((row + dy + rows) % rows) * cols + ((col + dx + cols) % cols)];
					}
				}
				const idx = row * cols + col;
				if (grid[idx] === 1) {
					next[idx] = neighbors === 2 || neighbors === 3 ? 1 : 0;
				} else {
					next[idx] = neighbors === 3 ? 1 : 0;
				}
			}
		}
		grid = next;
	}

	function replaceFigletChar(ch: string, seed: number): string {
		if (ch === '@') return ['@', '#', '%'][pseudo(seed) % 3];
		if (ch === '!') return ['!', 'i', 'l'][pseudo(seed + 1) % 3];
		if (ch === ':') return ['.', ';', ':'][pseudo(seed + 2) % 3];
		return ch;
	}

	function drawBase() {
		const t = frameCount * 7919;
		ctx.fillStyle = isDark ? '#000' : '#f5f5f5';
		ctx.fillRect(0, 0, cssW, cssH);
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				const seed = t + row * 9973 + col * 6271;
				const ch = chars[pseudo(seed) % chars.length];
				const key = row + ',' + col;
				const x = col * (cssW / cols);
				const y = row * (cssH / rows);

				if (row === mouseRow && col === mouseCol) {
					ctx.fillStyle = isDark ? '#f38ba8' : '#e64553';
				} else if (clickMeMap && clickMeMap.has(key)) {
					const c = clickMeMap.get(key)!;
					if (c.isCursor && !clickMeCursorVisible) continue;
					ctx.fillStyle = COLORS[pseudo(seed + 3) % COLORS.length];
					ctx.fillText(c.ch, x, y);
					continue;
				} else if (textMap && textMap.has(key)) {
					const c = textMap.get(key)!;
					ctx.fillStyle = COLORS[pseudo(seed + 3) % COLORS.length];
					ctx.fillText(replaceFigletChar(c.ch, seed), x, y);
					continue;
				} else if (grid[row * cols + col]) {
					ctx.fillStyle = COLORS[pseudo(seed + 3) % COLORS.length];
				} else {
					const b = isDark ? 5 + (pseudo(seed + 4) % 25) : 220 + (pseudo(seed + 4) % 35);
					ctx.fillStyle = `rgb(${b},${b},${b})`;
				}
				ctx.fillText(ch, x, y);
			}
		}
	}

	function placeGlider(cx: number, cy: number) {
		const glider = gliders[pseudo(cx * 9973 + cy * 6271 + frameCount) % gliders.length];
		for (const [dc, dr] of glider) {
			const r = (((cy + dr) % rows) + rows) % rows;
			const c = (((cx + dc) % cols) + cols) % cols;
			grid[r * cols + c] = 1;
		}
	}

	function onPointerMove(e: PointerEvent) {
		const rect = canvasEl.getBoundingClientRect();
		mouseCol = Math.floor((e.clientX - rect.left) / (cssW / cols));
		mouseRow = Math.floor((e.clientY - rect.top) / (cssH / rows));
	}

	function onPointerLeave() {
		mouseCol = -1;
		mouseRow = -1;
	}

	function onClick(e: PointerEvent) {
		const rect = canvasEl.getBoundingClientRect();
		const c = Math.floor((e.clientX - rect.left) / (cssW / cols));
		const r = Math.floor((e.clientY - rect.top) / (cssH / rows));
		placeGlider(c, r);
	}

	function loop() {
		if (!animating) return;
		rafId = requestAnimationFrame(loop);
		frameCount++;
		if (frameCount % 2 !== 0) return;
		if (frameCount % 8 === 0) stepGoL();
		clickMeCursorVisible = Math.floor(frameCount / 30) % 2 === 0;
		drawBase();
	}

	function handleResize() {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			const rect = canvasEl.parentElement!.getBoundingClientRect();
			init(rect.width, rect.height);
			for (let i = 0; i < gliderCount; i++) {
				placeGlider(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows));
			}
			drawBase();
		}, 200);
	}

	onMount(() => {
		const meas = document.createElement('canvas').getContext('2d')!;
		meas.font = `bold ${fontSize}px "Zed Mono", monospace`;
		charWidth = Math.ceil(meas.measureText('ア').width) + gap;
		charHeight = fontSize * 1.2 + gap;

		const rect = canvasEl.parentElement!.getBoundingClientRect();
		init(rect.width, rect.height);
		for (let i = 0; i < gliderCount; i++) {
			placeGlider(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows));
		}
		drawBase();

		canvasEl.addEventListener('pointermove', onPointerMove);
		canvasEl.addEventListener('pointerleave', onPointerLeave);
		canvasEl.addEventListener('click', onClick);

		const ro = new ResizeObserver(handleResize);
		ro.observe(canvasEl.parentElement!);

		rafId = requestAnimationFrame(loop);

		return () => {
			animating = false;
			cancelAnimationFrame(rafId);
			ro.disconnect();
			clearTimeout(resizeTimer);
		};
	});
</script>

<canvas bind:this={canvasEl} class="matrix-grid"></canvas>

<style>
	.matrix-grid {
		display: block;
		width: 100%;
		height: 100%;
		cursor: none;
		touch-action: pan-y;
		background: #000;
	}
</style>
