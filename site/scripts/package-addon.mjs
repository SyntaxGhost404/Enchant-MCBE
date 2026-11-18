// Builds the .mcaddon that the Download page offers, straight from the pack folders in this repository,
// and writes its size and SHA-256 for the page. The archive is reproducible: files are sorted and
// stamped with the time of the last commit that touched the packs.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const site = fileURLToPath(new URL('..', import.meta.url));
const repo = join(site, '..');
const packs = ['Enchant_Table_BP', 'Enchant_Table_RP'];

function walk(dir) {
	return readdirSync(dir, { withFileTypes: true })
		.filter((d) => !d.name.startsWith('.'))
		.flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
}

function lastPackCommit() {
	try {
		const out = execFileSync('git', ['log', '-1', '--format=%ct %h', '--', ...packs], { cwd: repo, encoding: 'utf8' }).trim();
		const [seconds, hash] = out.split(' ');
		if (seconds) return { date: new Date(Number(seconds) * 1000), commit: hash };
	} catch {
		// no git history (for example a downloaded archive): fall back to a fixed date
	}
	return { date: new Date(Date.UTC(2026, 0, 1)), commit: '' };
}

const manifest = JSON.parse(readFileSync(join(repo, 'Enchant_Table_BP/manifest.json'), 'utf8'));
const version = Array.isArray(manifest.header.version) ? manifest.header.version.join('.') : String(manifest.header.version);
const { date, commit } = lastPackCommit();
// zip timestamps have a two second resolution and no time zone
const mtime = new Date(Math.floor(date.getTime() / 2000) * 2000);

const entries = {};
const packStats = [];
for (const pack of packs) {
	const root = join(repo, pack);
	const files = walk(root).sort();
	let bytes = 0;
	for (const file of files) {
		const data = readFileSync(file);
		bytes += data.length;
		entries[relative(repo, file).split(sep).join('/')] = [new Uint8Array(data), { mtime }];
	}
	packStats.push({ folder: pack, files: files.length, bytes });
}
const sorted = Object.fromEntries(Object.keys(entries).sort().map((k) => [k, entries[k]]));
const archive = zipSync(sorted, { level: 9 });

const fileName = `EnchantPlus_${version}.mcaddon`;
const outDir = join(site, 'static', 'downloads');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, fileName), archive);

const info = {
	version,
	fileName,
	saveAs: `Enchant+ ${version}.mcaddon`,
	size: archive.length,
	sha256: createHash('sha256').update(archive).digest('hex'),
	files: Object.keys(sorted).length,
	packs: packStats,
	commit,
	packedAt: mtime.toISOString()
};
mkdirSync(join(site, 'src', 'lib', 'generated'), { recursive: true });
writeFileSync(join(site, 'src', 'lib', 'generated', 'package.json'), JSON.stringify(info, null, '\t') + '\n');
console.log(`packaged ${fileName}: ${info.files} files, ${(info.size / 1024).toFixed(1)} KB, sha256 ${info.sha256.slice(0, 12)}`);
statSync(join(outDir, fileName));
