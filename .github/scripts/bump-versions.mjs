import semver from 'semver';
import { writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';
import child_process from 'child_process';
import { promisify } from 'util';
import assert from 'assert';

const exec = promisify(child_process.exec);

const rootDir = process.cwd();
const releaseType = process.env.RELEASE_TYPE;
assert.match(releaseType, /^(patch|minor|major)$/, 'Invalid RELEASE_TYPE');

// TODO: if releaseType is `auto` determine release type based on the changelog

const lastTag = (await exec('git describe --tags --match "n8n@*" --abbrev=0')).stdout.trim();
const packages = JSON.parse((await exec('pnpm ls -r --only-projects --json')).stdout);

const packageMap = {};
for (let { name, path, version, private: isPrivate, dependencies } of packages) {
	if (isPrivate && path !== rootDir) continue;
	if (path === rootDir) name = 'monorepo-root';

	const isDirty = await exec(`git diff --quiet HEAD n8n@0.216.0 -- ${path}`)
		.then(() => false)
		.catch((error) => true);

	if (isDirty) {
		packageMap[name] = packageMap[name] ?? {}; // { dependents: {} };
		Object.assign(packageMap[name], {
			name,
			path,
			lastVersion: version,
			nextVersion: semver.inc(version, releaseType),
		});
	}

	// TODO: use this to bump version via dependents
	// for (const dependency in dependencies) {
	// 	packageMap[dependency] = packageMap[dependency] ?? { dependents: {} };
	// 	if (!(name in packageMap[dependency].dependents)) {
	// 		packageMap[dependency].dependents[name] = packageMap[name];
	// 	}
	// }
}

assert.notEqual(
	packageMap['n8n'].nextVersion,
	packageMap['n8n'].lastVersion,
	'No changes found since the last release',
);

// Keep the monorepo version up to date with the released version
packageMap['monorepo-root'].nextVersion = packageMap['n8n'].nextVersion;

for (const packageName in packageMap) {
	// TODO: also bump version if a dependency was bumped
	const { name, path, releaseType, lastVersion, nextVersion } = packageMap[packageName];
	const packageFile = resolve(path, 'package.json');
	const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
	packageJson.version = nextVersion;
	for (const dependencyType of ['dependencies', 'devDependencies']) {
		for (const dependency in packageJson[dependencyType]) {
			if (dependency in packageMap) {
				packageJson[dependencyType][dependency] = '~' + packageMap[dependency].nextVersion;
			}
		}
	}
	await writeFile(packageFile, JSON.stringify(packageJson, null, 2) + '\n');
}

console.log(packageMap['n8n'].nextVersion);
