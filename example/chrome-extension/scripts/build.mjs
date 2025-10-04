#!/usr/bin/env node
import { build, context } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const isWatch = process.argv.includes('--watch');
const browser = process.env.BROWSER || 'both'; // 'chrome', 'firefox', or 'both'

const buildForBrowser = async (targetBrowser) => {
  const distDir = join(rootDir, `dist-${targetBrowser}`);

  const watchPlugin = {
    name: 'watch-plugin',
    setup(build) {
      let isFirst = true;
      build.onEnd(result => {
        if (result.errors.length > 0) {
          console.error(`\x1b[31m✗ Build failed with ${result.errors.length} error(s)\x1b[0m`);
        } else if (!isFirst) {
          console.log(`\x1b[32m✓ Rebuilt at ${new Date().toLocaleTimeString()}\x1b[0m`);
        }
        isFirst = false;
      });
    }
  };

  const contentScriptOptions = {
    platform: 'browser',
    target: 'es2020',
    minify: !isWatch,
    sourcemap: true,
    bundle: true,
    external: ['chrome'],
    entryPoints: [join(rootDir, 'src/content.ts')],
    outfile: join(distDir, 'content.js'),
    format: 'iife',
    banner: {
      js: '// JailJS Content Script Bundle\n'
    },
    plugins: isWatch ? [watchPlugin] : []
  };

  const mergedOptions = {
    platform: 'browser',
    target: 'es2020',
    minify: !isWatch,
    sourcemap: true,
    bundle: true,
    external: ['chrome'],
    entryPoints: {
      'background': join(rootDir, 'src/background.ts'),
      'sidepanel': join(rootDir, 'src/sidepanel.ts')
    },
    outdir: distDir,
    format: 'iife',
    plugins: isWatch ? [watchPlugin] : []
  };

  if (isWatch) {
    const ctx1 = await context(contentScriptOptions);
    const ctx2 = await context(mergedOptions);
    await Promise.all([ctx1.watch(), ctx2.watch()]);
  } else {
    await Promise.all([build(contentScriptOptions), build(mergedOptions)]);
  }

  // Copy static files
  mkdirSync(distDir, { recursive: true });
  copyFileSync(
    join(rootDir, 'static/sidepanel.html'),
    join(distDir, 'sidepanel.html')
  );

  // Copy browser-specific manifest
  copyFileSync(
    join(rootDir, `static/manifest-${targetBrowser}.json`),
    join(distDir, 'manifest.json')
  );

  return distDir;
};

if (isWatch) {
  console.log('👀 Watching for changes...\n');
  const distDir = await buildForBrowser('chrome');
  console.log(`Watching Chrome extension at ${distDir}\n`);
  // Keep process alive
  await new Promise(() => {});
} else {
  console.log('🔨 Building extension...\n');

  const browsers = browser === 'both' ? ['chrome', 'firefox'] : [browser];

  for (const targetBrowser of browsers) {
    const distDir = await buildForBrowser(targetBrowser);

    const fs = await import('fs');
    console.log(`\n${targetBrowser.toUpperCase()}:`);
    const files = [
      { name: 'Content Script', path: 'content.js' },
      { name: 'Background', path: 'background.js' },
      { name: 'Sidepanel', path: 'sidepanel.js' }
    ];

    for (const file of files) {
      const fullPath = join(distDir, file.path);
      const stats = fs.statSync(fullPath);
      console.log(`  ✓ ${file.name}: ${file.path} (${(stats.size / 1024).toFixed(1)} KB)`);
    }
  }

  console.log('\n✓ Build complete!');
}
