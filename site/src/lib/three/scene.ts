/**
 * The Enchant+ table in a bookshelf room, rendered from the add-on's own files:
 * block model, texture, sphere model and idle animation, and the glow particle (lifetime, size, colour, flipbook).
 * Loaded on demand by TableViewer.svelte so three.js stays out of the first page load.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { game } from '$lib/addon/assets';
import { models } from './models';
import { parseJsonc } from '$lib/addon/parse';

type Vec3 = [number, number, number];
type FaceName = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
interface FaceUV {
	uv: [number, number];
	uv_size: [number, number];
}
interface Cube {
	origin: Vec3;
	size: Vec3;
	uv: Partial<Record<FaceName, FaceUV>>;
	rotation?: Vec3;
	pivot?: Vec3;
}
interface Bone {
	name: string;
	parent?: string;
	pivot: Vec3;
	cubes?: Cube[];
}
interface GeoFile {
	'minecraft:geometry': { description: { texture_width: number; texture_height: number }; bones: Bone[] }[];
}

const SHADE: Record<FaceName, number> = { up: 1, down: 0.5, north: 0.8, south: 0.8, east: 0.62, west: 0.62 };

/** collects faces into one geometry, so a whole room is a handful of draw calls */
class Builder {
	pos: number[] = [];
	uv: number[] = [];
	col: number[] = [];
	idx: number[] = [];

	face(quad: Vec3[], uvRect: [number, number, number, number], texW: number, texH: number, shade: number, matrix?: THREE.Matrix4) {
		const [u, v, uw, vh] = uvRect;
		const corners = [
			[u, v],
			[u + uw, v],
			[u + uw, v + vh],
			[u, v + vh]
		];
		const base = this.pos.length / 3;
		quad.forEach((p, i) => {
			const vec = new THREE.Vector3(...p);
			if (matrix) vec.applyMatrix4(matrix);
			this.pos.push(vec.x, vec.y, vec.z);
			this.uv.push(corners[i][0] / texW, 1 - corners[i][1] / texH);
			this.col.push(shade, shade, shade);
		});
		this.idx.push(base, base + 3, base + 1, base + 1, base + 3, base + 2);
	}

	geometry(): THREE.BufferGeometry {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
		g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
		g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
		g.setIndex(this.idx);
		return g;
	}
}

/** face corners straight from origin and origin + size, as the game does it (negative sizes turn a cube inside out) */
function cubeQuads(origin: Vec3, size: Vec3): Record<FaceName, Vec3[]> {
	const [x0, y0, z0] = origin;
	const [x1, y1, z1] = origin.map((v, i) => v + size[i]) as Vec3;
	return {
		north: [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]],
		south: [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]],
		east: [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]],
		west: [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]],
		up: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
		down: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]]
	};
}

function addCube(b: Builder, c: Cube, texW: number, texH: number, shade: boolean, matrix?: THREE.Matrix4) {
	let m = matrix;
	if (c.rotation && c.pivot) {
		const pivot = new THREE.Vector3(...c.pivot);
		const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...c.rotation.map((d) => THREE.MathUtils.degToRad(d)) as Vec3, 'XYZ'));
		const local = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(rot).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
		m = matrix ? matrix.clone().multiply(local) : local;
	}
	const quads = cubeQuads(c.origin, c.size);
	for (const name of Object.keys(quads) as FaceName[]) {
		const f = c.uv[name];
		if (!f || f.uv_size[0] === 0 || f.uv_size[1] === 0) continue;
		const q = quads[name];
		const a = new THREE.Vector3(...q[0]);
		if (a.distanceTo(new THREE.Vector3(...q[1])) * a.distanceTo(new THREE.Vector3(...q[3])) === 0) continue;
		b.face(q, [f.uv[0], f.uv[1], f.uv_size[0], f.uv_size[1]], texW, texH, shade ? SHADE[name] : 1, m);
	}
}

function loadTexture(url: string): Promise<THREE.Texture> {
	return new Promise((resolve, reject) =>
		new THREE.TextureLoader().load(
			url,
			(t) => {
				t.magFilter = THREE.NearestFilter;
				t.minFilter = THREE.NearestFilter;
				t.generateMipmaps = false;
				t.colorSpace = THREE.SRGBColorSpace;
				resolve(t);
			},
			undefined,
			reject
		)
	);
}

/** a bone hierarchy as nested groups, each bone's cubes merged into one mesh */
function buildModel(geo: GeoFile, material: THREE.Material, shade: boolean) {
	const g = geo['minecraft:geometry'][0];
	const { texture_width: w, texture_height: h } = g.description;
	const root = new THREE.Group();
	const bones: Record<string, { group: THREE.Group; inner: THREE.Group; pivot: Vec3 }> = {};
	for (const bone of g.bones) {
		const group = new THREE.Group();
		group.position.set(...bone.pivot);
		const inner = new THREE.Group();
		inner.position.set(-bone.pivot[0], -bone.pivot[1], -bone.pivot[2]);
		group.add(inner);
		if (bone.cubes?.length) {
			const b = new Builder();
			for (const c of bone.cubes) addCube(b, c, w, h, shade);
			inner.add(new THREE.Mesh(b.geometry(), material));
		}
		bones[bone.name] = { group, inner, pivot: bone.pivot };
	}
	for (const bone of g.bones) (bone.parent ? bones[bone.parent].inner : root).add(bones[bone.name].group);
	return { root, bones };
}

type Keys = Record<string, number[]>;
function sample(keys: Keys, t: number): number[] {
	const times = Object.keys(keys)
		.map(Number)
		.sort((a, b) => a - b);
	const at = (time: number) => keys[time.toFixed(1)] ?? keys[String(time)] ?? keys[Object.keys(keys).find((k) => Number(k) === time)!];
	for (let i = 0; i < times.length - 1; i++) {
		if (t >= times[i] && t <= times[i + 1]) {
			const a = at(times[i]);
			const b = at(times[i + 1]);
			const k = (t - times[i]) / (times[i + 1] - times[i]);
			return a.map((v, j) => v + (b[j] - v) * k);
		}
	}
	return at(times[times.length - 1]);
}

export interface SceneController {
	resetView(): void;
	setRunning(running: boolean): void;
	dispose(): void;
	onInteract(callback: () => void): void;
}

export async function createScene(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }): Promise<SceneController> {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x15110d);
	scene.fog = new THREE.Fog(0x15110d, 110, 240);

	const urls = {
		bookshelf: game('blocks/bookshelf'),
		oak: game('blocks/planks_oak'),
		spruce: game('blocks/planks_spruce'),
		log: game('blocks/log_spruce'),
		logTop: game('blocks/log_spruce_top')
	};
	const [bookshelf, oak, spruce, log, logTop, tableTex, sphereTex, glowTex] = await Promise.all([
		loadTexture(urls.bookshelf),
		loadTexture(urls.oak),
		loadTexture(urls.spruce),
		loadTexture(urls.log),
		loadTexture(urls.logTop),
		loadTexture(models.tableTexture),
		loadTexture(models.sphereTexture),
		loadTexture(models.glowTexture)
	]);

	// ---- the room: one geometry per texture, hidden faces between blocks skipped ----
	const textures = { bookshelf, oak, spruce, log, logTop };
	type Tex = keyof typeof textures;
	const blocks = new Map<string, { top: Tex; side: Tex; bottom: Tex }>();
	const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
	const put = (x: number, y: number, z: number, t: { top: Tex; side: Tex; bottom: Tex }) => blocks.set(key(x, y, z), t);
	const shelf = { top: 'oak', side: 'bookshelf', bottom: 'oak' } as const;
	const pillar = { top: 'logTop', side: 'log', bottom: 'logTop' } as const;
	const plank = { top: 'spruce', side: 'spruce', bottom: 'spruce' } as const;
	const R = 6;
	for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) put(x, -1, z, plank);
	for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) put(x, 4, z, plank);
	for (let y = 0; y < 4; y++) {
		for (let i = -R; i <= R; i++) {
			const corner = Math.abs(i) === R;
			const post = corner || i % 3 === 0;
			put(i, y, R, post ? pillar : shelf);
			put(i, y, -R, post ? pillar : shelf);
			put(R, y, i, post ? pillar : shelf);
			put(-R, y, i, post ? pillar : shelf);
		}
	}
	const builders = Object.fromEntries(Object.keys(textures).map((t) => [t, new Builder()])) as Record<Tex, Builder>;
	const dirs: [FaceName, Vec3][] = [
		['north', [0, 0, -1]],
		['south', [0, 0, 1]],
		['east', [1, 0, 0]],
		['west', [-1, 0, 0]],
		['up', [0, 1, 0]],
		['down', [0, -1, 0]]
	];
	for (const [k, t] of blocks) {
		const [bx, by, bz] = k.split(',').map(Number);
		const quads = cubeQuads([bx * 16 - 8, by * 16, bz * 16 - 8], [16, 16, 16]);
		for (const [name, d] of dirs) {
			if (blocks.has(key(bx + d[0], by + d[1], bz + d[2]))) continue;
			const tex = name === 'up' ? t.top : name === 'down' ? t.bottom : t.side;
			builders[tex].face(quads[name], [0, 0, 16, 16], 16, 16, SHADE[name]);
		}
	}
	const disposables: { dispose(): void }[] = [];
	for (const t of Object.keys(textures) as Tex[]) {
		if (!builders[t].pos.length) continue;
		const geometry = builders[t].geometry();
		const material = new THREE.MeshBasicMaterial({ map: textures[t], vertexColors: true, color: 0xd9cfc0 });
		scene.add(new THREE.Mesh(geometry, material));
		disposables.push(geometry, material);
	}

	// ---- the add-on's table and sphere ----
	const tableMaterial = new THREE.MeshBasicMaterial({ map: tableTex, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
	const table = buildModel(parseJsonc<GeoFile>(models.tableGeo), tableMaterial, true);
	scene.add(table.root);
	// the sphere entity floats at the block corner + (0.45, 0.8, 0.47); entity materials cull back faces
	const sphereMaterial = new THREE.MeshBasicMaterial({ map: sphereTex, vertexColors: true, alphaTest: 0.05, side: THREE.FrontSide });
	const sphere = buildModel(parseJsonc<GeoFile>(models.sphereGeo), sphereMaterial, true);
	const holder = new THREE.Group();
	holder.position.set((0.45 - 0.5) * 16, 0.8 * 16, (0.47 - 0.5) * 16);
	holder.add(sphere.root);
	scene.add(holder);
	disposables.push(tableMaterial, sphereMaterial);

	const anim = parseJsonc<{ animations: Record<string, { animation_length: number; bones: Record<string, { rotation: Keys; position: Keys }> }> }>(models.sphereAnim);
	const idle = Object.values(anim.animations)[0];
	const sphereBone = sphere.bones[Object.keys(idle.bones)[0]] ?? Object.values(sphere.bones)[0];
	const idleKeys = Object.values(idle.bones)[0];

	// ---- the glow particle, from its particle file ----
	const particle = parseJsonc<{
		particle_effect: { components: Record<string, any> };
	}>(models.particle).particle_effect.components;
	const life: number = particle['minecraft:particle_lifetime_expression']?.max_lifetime ?? 0.4;
	const speed: number = (particle['minecraft:particle_initial_speed'] ?? 0.5) * 16;
	const radius: number = (particle['minecraft:emitter_shape_sphere']?.radius ?? 0.3) * 16;
	const size: number = (particle['minecraft:particle_appearance_billboard']?.size?.[0] ?? 0.1) * 16 * 2.2;
	const tint: number[] = particle['minecraft:particle_appearance_tinting']?.color ?? [0.69, 0, 1, 1];
	const flip = particle['minecraft:particle_appearance_billboard']?.uv;
	const frameU = (flip?.flipbook?.size_UV?.[0] ?? 32) / (flip?.texture_width ?? 192);
	const fps: number = flip?.flipbook?.frames_per_second ?? 4;
	const frames = Math.round(1 / frameU);
	const pool: { sprite: THREE.Sprite; born: number; dir: THREE.Vector3; start: number }[] = [];
	for (let i = 0; i < 12; i++) {
		const map = glowTex.clone();
		map.repeat.set(frameU, 1);
		map.needsUpdate = true;
		const material = new THREE.SpriteMaterial({ map, color: new THREE.Color(tint[0], tint[1], tint[2]), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
		const sprite = new THREE.Sprite(material);
		sprite.scale.set(size, size, 1);
		sprite.visible = false;
		scene.add(sprite);
		pool.push({ sprite, born: -10, dir: new THREE.Vector3(), start: 0 });
		disposables.push(material, map);
	}
	const emitAt = new THREE.Vector3().copy(holder.position).add(new THREE.Vector3(0, 0.2 * 16, 0));
	let nextSpawn = 0;
	let spawnIndex = 0;

	// ---- camera and touch controls ----
	const camera = new THREE.PerspectiveCamera(52, 1, 1, 600);
	const target = new THREE.Vector3(0, 13, 0);
	const home = new THREE.Vector3(0, 27, -40);
	camera.position.copy(home);
	const controls = new OrbitControls(camera, canvas);
	controls.target.copy(target);
	controls.enablePan = false;
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.rotateSpeed = 0.55;
	controls.minDistance = 26;
	controls.maxDistance = 62;
	controls.minPolarAngle = THREE.MathUtils.degToRad(48);
	controls.maxPolarAngle = THREE.MathUtils.degToRad(84);
	controls.autoRotate = !opts.reducedMotion;
	controls.autoRotateSpeed = 0.7;
	controls.update();
	// vertical swipes keep scrolling the page; sideways drags and pinches go to the view
	canvas.style.touchAction = 'pan-y';

	let interactCallback: (() => void) | undefined;
	let idleTimer: ReturnType<typeof setTimeout> | undefined;
	controls.addEventListener('start', () => {
		controls.autoRotate = false;
		clearTimeout(idleTimer);
		interactCallback?.();
	});
	controls.addEventListener('end', () => {
		clearTimeout(idleTimer);
		if (!opts.reducedMotion) idleTimer = setTimeout(() => (controls.autoRotate = true), 6000);
	});

	// plain wheel scrolls the page; pinch zoom on trackpads (ctrl + wheel) still zooms
	const wheelGuard = (event: WheelEvent) => {
		if (!event.ctrlKey) event.stopImmediatePropagation();
	};
	canvas.addEventListener('wheel', wheelGuard, { capture: true });

	function resize() {
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (!w || !h) return;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}
	const ro = new ResizeObserver(resize);
	ro.observe(canvas);
	resize();

	// ---- animation loop, paused when off screen ----
	let last = 0;
	let elapsed = 0;
	let running = false;
	let frame = 0;

	function step(now: number) {
		const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
		last = now;
		if (!opts.reducedMotion) elapsed += dt;
		const t = elapsed % idle.animation_length;
		const rot = sample(idleKeys.rotation, t);
		const pos = sample(idleKeys.position, t);
		sphereBone.group.rotation.set(...(rot.map((d) => THREE.MathUtils.degToRad(d)) as Vec3));
		sphereBone.group.position.set(sphereBone.pivot[0] + pos[0], sphereBone.pivot[1] + pos[1], sphereBone.pivot[2] + pos[2]);
		// one particle per game tick (20 per second), like the add-on's tick function
		if (!opts.reducedMotion) {
			while (nextSpawn <= elapsed) {
				const p = pool[spawnIndex++ % pool.length];
				const theta = Math.random() * Math.PI * 2;
				const phi = Math.acos(2 * Math.random() - 1);
				p.dir.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
				p.start = radius * Math.cbrt(Math.random());
				p.born = nextSpawn;
				nextSpawn += 1 / 20;
			}
		}
		for (const p of pool) {
			const age = elapsed - p.born;
			if (age < 0 || age >= life) {
				p.sprite.visible = false;
				continue;
			}
			p.sprite.visible = true;
			p.sprite.position.copy(emitAt).addScaledVector(p.dir, p.start + speed * age);
			const map = (p.sprite.material as THREE.SpriteMaterial).map!;
			map.offset.set(Math.min(Math.floor(age * fps), frames - 1) * frameU, 0);
			(p.sprite.material as THREE.SpriteMaterial).opacity = 1 - (age / life) * 0.6;
		}
		controls.update();
		renderer.render(scene, camera);
		if (running) frame = requestAnimationFrame(step);
	}

	return {
		resetView() {
			camera.position.copy(home);
			controls.target.copy(target);
			controls.update();
			if (!opts.reducedMotion) controls.autoRotate = true;
		},
		setRunning(next: boolean) {
			if (next === running) return;
			running = next;
			if (running) {
				last = 0;
				frame = requestAnimationFrame(step);
			} else {
				cancelAnimationFrame(frame);
			}
		},
		onInteract(callback) {
			interactCallback = callback;
		},
		dispose() {
			running = false;
			cancelAnimationFrame(frame);
			clearTimeout(idleTimer);
			ro.disconnect();
			canvas.removeEventListener('wheel', wheelGuard, { capture: true });
			controls.dispose();
			scene.traverse((o) => {
				if (o instanceof THREE.Mesh) o.geometry.dispose();
			});
			for (const d of disposables) d.dispose();
			for (const t of [bookshelf, oak, spruce, log, logTop, tableTex, sphereTex, glowTex]) t.dispose();
			renderer.dispose();
		}
	};
}
