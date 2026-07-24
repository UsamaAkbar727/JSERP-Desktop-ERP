#!/usr/bin/env node

const { spawn } = require('child_process');
const { build } = require('esbuild');
const { resolve } = require('path');
const { watch } = require('fs');

let electronProcess;

const buildElectron = async () => {
  try {
    await Promise.all([
      build({
        entryPoints: [resolve(__dirname, '../electron/main.ts')],
        outfile: resolve(__dirname, '../dist-electron/main.js'),
        bundle: true,
        platform: 'node',
        target: 'node16',
        external: ['electron'],
        format: 'cjs',
        sourcemap: true,
        define: {
          'process.env.NODE_ENV': '"development"',
        },
      }),
      build({
        entryPoints: [resolve(__dirname, '../electron/preload.ts')],
        outfile: resolve(__dirname, '../dist-electron/preload.js'),
        bundle: true,
        platform: 'node',
        target: 'node16',
        external: ['electron'],
        format: 'cjs',
        sourcemap: true,
      }),
    ]);
  } catch (error) {
    console.error('✗ Electron build failed:', error);
  }
};

const startElectron = () => {
  if (electronProcess) {
    electronProcess.kill();
  }
  
  electronProcess = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  
  electronProcess.on('close', () => {
    process.exit();
  });
};

const main = async () => {
  // Initial build
  await buildElectron();
  
  // Watch for changes
  watch(resolve(__dirname, '../electron'), { recursive: true }, async (eventType, filename) => {
    if (filename?.endsWith('.ts')) {
      await buildElectron();
      startElectron();
    }
  });
  
  // Start Electron
  startElectron();
};

if (require.main === module) {
  main();
}