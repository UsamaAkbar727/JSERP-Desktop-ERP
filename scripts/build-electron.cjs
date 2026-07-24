const { build } = require('esbuild');
const { resolve } = require('path');
const { writeFileSync, readFileSync, cpSync, existsSync, rmSync } = require('fs');
const { cp } = require('fs').promises;

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;
const isCI = process.env.CI === 'true';

// Environment-specific settings
const ENV_SETTINGS = {
  production: {
    minify: true,
    sourcemap: false,
    treeShaking: true,
    logLevel: 'warning',
    devtools: false
  },
  development: {
    minify: false,
    sourcemap: 'inline',
    treeShaking: false,
    logLevel: 'info',
    devtools: true
  }
};

const settings = ENV_SETTINGS[process.env.NODE_ENV] || ENV_SETTINGS.development;

console.log(`🔧 Building Electron (${process.env.NODE_ENV || 'development'})`);
if (isCI) {
  console.log('🤖 Running in CI environment');
}

// Read package.json for version and metadata
const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
const version = packageJson.version;

// Enhanced environment variables for runtime
const runtimeDefines = {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  'process.env.VERSION': JSON.stringify(version),
  'process.env.PRODUCT_NAME': JSON.stringify(packageJson.productName || 'JSERP'),
  'process.env.IS_PRODUCTION': JSON.stringify(isProduction),
  'process.env.IS_DEV': JSON.stringify(isDevelopment),
  'process.env.ENABLE_DEVTOOLS': JSON.stringify(settings.devtools),
  'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
  'process.env.BUILD_HASH': JSON.stringify(getBuildHash()),
};

// Generate build hash for cache busting
function getBuildHash() {
  const crypto = require('crypto');
  const buildInfo = `${version}-${process.env.NODE_ENV}-${Date.now()}`;
  return crypto.createHash('md5').update(buildInfo).digest('hex').substring(0, 8);
}

const buildConfig = {
  define: runtimeDefines,
  logLevel: settings.logLevel,
  treeShaking: settings.treeShaking,
};

const buildMain = () => {
  console.log('📦 Building main process...');
  return build({
    entryPoints: [resolve(__dirname, '../electron/main.ts')],
    outfile: resolve(__dirname, '../dist-electron/main.js'),
    bundle: true,
    platform: 'node',
    target: 'node16',
    external: ['electron', 'better-sqlite3'],
    format: 'cjs',
    sourcemap: settings.sourcemap,
    minify: settings.minify,
    ...buildConfig,
  });
};

const buildPreload = () => {
  console.log('📦 Building preload script...');
  return build({
    entryPoints: [resolve(__dirname, '../electron/preload.ts')],
    outfile: resolve(__dirname, '../dist-electron/preload.js'),
    bundle: true,
    platform: 'node',
    target: 'node16',
    external: ['electron'],
    format: 'cjs',
    sourcemap: settings.sourcemap,
    minify: settings.minify,
    ...buildConfig,
  });
};

const createElectronPackageJson = () => {
  console.log('📝 Creating electron package.json...');
  const electronPackage = {
    name: packageJson.name,
    productName: packageJson.productName,
    version: version,
    main: 'main.js',
    author: packageJson.author || 'Jahasoft',
    description: packageJson.description || 'JSERP Desktop Application',
    homepage: packageJson.homepage,
    build: {
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  };

  writeFileSync(
    resolve(__dirname, '../dist-electron/package.json'),
    JSON.stringify(electronPackage, null, 2)
  );
};

const copyNativeModules = () => {
  console.log('🔗 Copying native modules...');
  const distElectronNodeModules = resolve(__dirname, '../dist-electron/node_modules');
  const sourceNodeModules = resolve(__dirname, '../node_modules');
  
  // List of native modules that need to be copied
  const nativeModules = ['better-sqlite3'];
  
  // Create dist-electron/node_modules if it doesn't exist
  if (!existsSync(distElectronNodeModules)) {
    require('fs').mkdirSync(distElectronNodeModules, { recursive: true });
  }
  
  for (const moduleName of nativeModules) {
    const sourcePath = resolve(sourceNodeModules, moduleName);
    const destPath = resolve(distElectronNodeModules, moduleName);
    
    if (existsSync(sourcePath)) {
      // Always copy to ensure we have the latest rebuilt version
      try {
        // Remove old version if exists
        if (existsSync(destPath)) {
          rmSync(destPath, { recursive: true, force: true });
        }
        // Copy fresh version
        cpSync(sourcePath, destPath, { recursive: true, force: true });
        console.log(`✅ Copied native module: ${moduleName}`);
      } catch (error) {
        console.warn(`⚠️ Error copying native module ${moduleName}: ${error.message}`);
      }
    } else {
      console.warn(`⚠️ Native module not found: ${moduleName}`);
    }
  }
};

// Build performance tracking
const buildStart = Date.now();

Promise.all([buildMain(), buildPreload()])
  .then(() => {
    createElectronPackageJson();
    copyNativeModules();
    
    const buildTime = ((Date.now() - buildStart) / 1000).toFixed(2);
    console.log(`\n✅ Electron build completed in ${buildTime}s`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏷️  Version: ${version}`);
    console.log(`🗂️  Output: dist-electron/`);
    
    if (isProduction) {
      console.log('🚀 Production build optimizations applied');
    }
  })
  .catch((error) => {
    console.error('❌ Electron build failed:', error);
    process.exit(1);
  });