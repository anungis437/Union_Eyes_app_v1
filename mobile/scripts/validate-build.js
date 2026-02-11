#!/usr/bin/env node

/**
 * Pre-Build Validation Script
 *
 * Validates that the app is ready for production build
 *
 * Usage:
 *   node scripts/validate-build.js
 */

const fs = require('fs');
const path = require('path');

const MOBILE_DIR = path.join(__dirname, '..');
const APP_JSON_PATH = path.join(MOBILE_DIR, 'app.json');
const PACKAGE_JSON_PATH = path.join(MOBILE_DIR, 'package.json');

const errors = [];
const warnings = [];

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Validate app.json
 */
function validateAppJson() {
  console.log('📱 Validating app.json...');

  if (!fileExists(APP_JSON_PATH)) {
    errors.push('app.json not found');
    return;
  }

  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  const expo = appJson.expo;

  // Required fields
  if (!expo.name) errors.push('app.json: Missing expo.name');
  if (!expo.slug) errors.push('app.json: Missing expo.slug');
  if (!expo.version) errors.push('app.json: Missing expo.version');

  // iOS validation
  if (expo.ios) {
    if (!expo.ios.bundleIdentifier) {
      errors.push('app.json: Missing expo.ios.bundleIdentifier');
    }
    if (!expo.ios.buildNumber) {
      warnings.push('app.json: Missing expo.ios.buildNumber');
    }
  } else {
    errors.push('app.json: Missing expo.ios configuration');
  }

  // Android validation
  if (expo.android) {
    if (!expo.android.package) {
      errors.push('app.json: Missing expo.android.package');
    }
    if (!expo.android.versionCode) {
      warnings.push('app.json: Missing expo.android.versionCode');
    }
  } else {
    errors.push('app.json: Missing expo.android configuration');
  }

  // Assets validation
  if (!expo.icon) {
    errors.push('app.json: Missing expo.icon');
  } else if (!fileExists(path.join(MOBILE_DIR, expo.icon))) {
    errors.push(`app.json: Icon file not found: ${expo.icon}`);
  }

  if (!expo.splash?.image) {
    errors.push('app.json: Missing expo.splash.image');
  } else if (!fileExists(path.join(MOBILE_DIR, expo.splash.image))) {
    errors.push(`app.json: Splash image not found: ${expo.splash.image}`);
  }

  // Privacy policy
  if (!expo.privacy || expo.privacy === 'unlisted') {
    warnings.push('app.json: Consider setting expo.privacy to "public"');
  }

  console.log('✅ app.json validation complete\n');
}

/**
 * Validate package.json
 */
function validatePackageJson() {
  console.log('📦 Validating package.json...');

  if (!fileExists(PACKAGE_JSON_PATH)) {
    errors.push('package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

  // Check for required dependencies
  const requiredDeps = ['expo', 'react', 'react-native'];

  requiredDeps.forEach((dep) => {
    if (!packageJson.dependencies?.[dep]) {
      errors.push(`package.json: Missing required dependency: ${dep}`);
    }
  });

  // Check version matches app.json
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  if (packageJson.version !== appJson.expo.version) {
    warnings.push(
      `Version mismatch: package.json (${packageJson.version}) vs app.json (${appJson.expo.version})`
    );
  }

  console.log('✅ package.json validation complete\n');
}

/**
 * Validate environment files
 */
function validateEnvironment() {
  console.log('🌍 Validating environment files...');

  const envFiles = ['env/.env.development', 'env/.env.preview', 'env/.env.production'];

  envFiles.forEach((envFile) => {
    const envPath = path.join(MOBILE_DIR, envFile);
    if (!fileExists(envPath)) {
      warnings.push(`Environment file not found: ${envFile}`);
    }
  });

  console.log('✅ Environment validation complete\n');
}

/**
 * Validate assets
 */
function validateAssets() {
  console.log('🎨 Validating assets...');

  const requiredAssets = [
    'assets/icon.png',
    'assets/adaptive-icon.png',
    'assets/splash.png',
    'assets/favicon.png',
  ];

  requiredAssets.forEach((asset) => {
    const assetPath = path.join(MOBILE_DIR, asset);
    if (!fileExists(assetPath)) {
      warnings.push(`Asset not found: ${asset}`);
    }
  });

  console.log('✅ Assets validation complete\n');
}

/**
 * Validate EAS configuration
 */
function validateEAS() {
  console.log('🏗️  Validating EAS configuration...');

  const easJsonPath = path.join(MOBILE_DIR, 'eas.json');
  if (!fileExists(easJsonPath)) {
    errors.push('eas.json not found');
    return;
  }

  const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

  if (!easJson.build) {
    errors.push('eas.json: Missing build configuration');
  }

  if (!easJson.submit) {
    warnings.push('eas.json: Missing submit configuration');
  }

  console.log('✅ EAS validation complete\n');
}

/**
 * Check for common issues
 */
function checkCommonIssues() {
  console.log('🔍 Checking for common issues...');

  // Check for console.log statements
  const srcDir = path.join(MOBILE_DIR, 'src');
  if (fileExists(srcDir)) {
    // This is a basic check - you might want to use a more sophisticated method
    warnings.push('Remember to remove console.log statements before production build');
  }

  // Check for TODO comments
  warnings.push('Remember to resolve TODO comments before production build');

  // Check for test credentials
  warnings.push('Ensure no test credentials are in the build');

  console.log('✅ Common issues check complete\n');
}

/**
 * Print summary
 */
function printSummary() {
  console.log('═══════════════════════════════════════');
  console.log('           VALIDATION SUMMARY          ');
  console.log('═══════════════════════════════════════\n');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All validations passed! Ready for build.\n');
    return 0;
  }

  if (errors.length > 0) {
    console.log('❌ ERRORS:\n');
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`);
    });
    console.log('');
  }

  if (errors.length > 0) {
    console.log('❌ Build validation FAILED. Fix errors before building.\n');
    return 1;
  } else {
    console.log('⚠️  Build validation passed with warnings. Review warnings before building.\n');
    return 0;
  }
}

/**
 * Main function
 */
function main() {
  console.log('\n🔍 UnionEyes Mobile - Build Validation\n');
  console.log('═══════════════════════════════════════\n');

  try {
    validateAppJson();
    validatePackageJson();
    validateEnvironment();
    validateAssets();
    validateEAS();
    checkCommonIssues();

    const exitCode = printSummary();
    process.exit(exitCode);
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

