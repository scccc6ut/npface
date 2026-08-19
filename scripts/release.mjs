#!/usr/bin/env node
// Release helper: bump both packages to the same version, run checks, build, publish.
//
//   pnpm release 0.1.0            # publish npface@0.1.0 and npface-react@0.1.0
//   pnpm release 0.1.0 --dry-run  # everything except the actual publish
//   pnpm release 0.1.0 --tag next # npm dist-tag
//
// Requires: `npm login` done beforehand, clean git tree.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const version = args.find((a) => !a.startsWith('--'));
const dry = args.includes('--dry-run');
const tagIdx = args.indexOf('--tag');
const tag = tagIdx >= 0 ? args[tagIdx + 1] : 'latest';

if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error('usage: pnpm release <version> [--dry-run] [--tag <dist-tag>]');
  process.exit(1);
}

const run = (cmd, opts = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
};

const pkgs = ['packages/core', 'packages/react'];

// 1. guard: clean tree
const status = execSync('git status --porcelain').toString().trim();
if (status && !dry) {
  console.error('Working tree is not clean — commit or stash first.');
  process.exit(1);
}

// 2. bump versions (keep both packages in lockstep)
for (const dir of pkgs) {
  const file = resolve(dir, 'package.json');
  const json = JSON.parse(readFileSync(file, 'utf8'));
  json.version = version;
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`bumped ${json.name} → ${version}`);
}

// 3. checks + build
run('pnpm lint');
run('pnpm build');
run('pnpm typecheck');
run('pnpm test');
run('pnpm size');

// 4. publish
for (const dir of pkgs) {
  run(`pnpm publish --access public --no-git-checks --tag ${tag}${dry ? ' --dry-run' : ''}`, {
    cwd: resolve(dir),
  });
}

if (!dry) {
  run(`git add packages/*/package.json`);
  run(`git commit -m "release: v${version}"`);
  run(`git tag v${version}`);
  console.log(`\nDone. Push with: git push && git push --tags`);
} else {
  run('git checkout -- packages/core/package.json packages/react/package.json');
  console.log('\nDry run complete (package.json versions restored).');
}
