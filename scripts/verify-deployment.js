#!/usr/bin/env node

/**
 * Deployment Verification Script
 *
 * This script verifies that all necessary files are present after a Next.js build
 * and checks for common deployment issues.
 *
 * Usage: node scripts/verify-deployment.js
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', '.next');
const STATIC_DIR = path.join(BUILD_DIR, 'static');
const CHUNKS_DIR = path.join(STATIC_DIR, 'chunks');

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };

  const icons = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    error: '✗'
  };

  console.log(`${colors[type]}${icons[type]} ${message}${colors.reset}`);
}

function checkDirectory(dir, name) {
  if (!fs.existsSync(dir)) {
    log(`${name} directory not found: ${dir}`, 'error');
    return false;
  }
  log(`${name} directory exists: ${dir}`, 'success');
  return true;
}

function countFiles(dir) {
  try {
    const files = fs.readdirSync(dir);
    return files.filter(f => fs.statSync(path.join(dir, f)).isFile()).length;
  } catch (e) {
    return 0;
  }
}

function checkBuildManifest() {
  const manifestPath = path.join(BUILD_DIR, 'build-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    log('Build manifest not found', 'error');
    return false;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    log('Build manifest is valid', 'success');

    // Check for admin orders page chunks
    const adminOrdersChunks = manifest.pages?.['/admin/orders'] || [];
    if (adminOrdersChunks.length === 0) {
      log('Admin orders page chunks not found in manifest', 'warning');
    } else {
      log(`Admin orders page has ${adminOrdersChunks.length} chunks`, 'info');
    }

    return true;
  } catch (e) {
    log(`Build manifest is invalid: ${e.message}`, 'error');
    return false;
  }
}

function checkStaticFiles() {
  const buildId = path.join(BUILD_DIR, 'BUILD_ID');
  if (!fs.existsSync(buildId)) {
    log('BUILD_ID file not found', 'warning');
  } else {
    const id = fs.readFileSync(buildId, 'utf8').trim();
    log(`BUILD_ID: ${id}`, 'info');
  }
}

function main() {
  console.log('\n=== Next.js Deployment Verification ===\n');

  let hasErrors = false;

  // Check build directory
  if (!checkDirectory(BUILD_DIR, 'Build')) {
    log('Build directory missing. Run "npm run build" first.', 'error');
    process.exit(1);
  }

  // Check static directory
  if (!checkDirectory(STATIC_DIR, 'Static')) {
    hasErrors = true;
  }

  // Check chunks directory
  if (!checkDirectory(CHUNKS_DIR, 'Chunks')) {
    hasErrors = true;
  } else {
    const chunkCount = countFiles(CHUNKS_DIR);
    log(`Found ${chunkCount} chunk files`, 'info');

    if (chunkCount === 0) {
      log('No chunk files found! Build may have failed.', 'error');
      hasErrors = true;
    } else if (chunkCount < 10) {
      log('Unusually low number of chunks. This may indicate an incomplete build.', 'warning');
    }
  }

  // Check build manifest
  if (!checkBuildManifest()) {
    hasErrors = true;
  }

  // Check static files
  checkStaticFiles();

  // Check app directory chunks
  const appChunksDir = path.join(CHUNKS_DIR, 'app');
  if (fs.existsSync(appChunksDir)) {
    const appChunkCount = countFiles(appChunksDir);
    log(`Found ${appChunkCount} app-specific chunks`, 'info');
  }

  console.log('\n=== Summary ===\n');

  if (hasErrors) {
    log('Verification completed with errors. Please fix the issues before deploying.', 'error');
    process.exit(1);
  } else {
    log('Verification completed successfully! Build is ready for deployment.', 'success');
    console.log('\nDeployment checklist:');
    console.log('  1. Upload entire .next directory');
    console.log('  2. Ensure all files maintain their structure');
    console.log('  3. Set proper cache headers for _next/static files');
    console.log('  4. Configure WebSocket support if using Socket.IO');
    console.log('  5. Set environment variables (NEXT_PUBLIC_API_BASE, etc.)');
    console.log('  6. Test the deployment before switching DNS\n');
    process.exit(0);
  }
}

main();
