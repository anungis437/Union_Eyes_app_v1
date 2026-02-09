#!/usr/bin/env node

/**
 * Version Bump Script
 *
 * Automatically increments version numbers for iOS and Android
 *
 * Usage:
 *   node scripts/bump-version.js [major|minor|patch]
 *   node scripts/bump-version.js patch  // 1.0.0 -> 1.0.1
 *   node scripts/bump-version.js minor  // 1.0.0 -> 1.1.0
 *   node scripts/bump-version.js major  // 1.0.0 -> 2.0.0
 */

const fs = require('fs');
const path = require('path');

const MOBILE_DIR = path.join(__dirname, '..');
const APP_JSON_PATH = path.join(MOBILE_DIR, 'app.json');
const PACKAGE_JSON_PATH = path.join(MOBILE_DIR, 'package.json');

/**
 * Parse semantic version
 */
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Increment version based on type
 */
function incrementVersion(version, type) {
  const parts = parseVersion(version);

  switch (type) {
    case 'major':
      parts.major += 1;
      parts.minor = 0;
      parts.patch = 0;
      break;
    case 'minor':
      parts.minor += 1;
      parts.patch = 0;
      break;
    case 'patch':
      parts.patch += 1;
      break;
    default:
      throw new Error(`Invalid version type: ${type}. Use: major, minor, or patch`);
  }

  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

/**
 * Update app.json
 */
function updateAppJson(newVersion, newBuildNumber, newVersionCode) {
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

  // Update version
  appJson.expo.version = newVersion;

  // Update iOS build number
  if (appJson.expo.ios) {
    appJson.expo.ios.buildNumber = newBuildNumber.toString();
  }

  // Update Android version code
  if (appJson.expo.android) {
    appJson.expo.android.versionCode = newVersionCode;
  }

  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');
  console.log(
    `✅ Updated app.json: v${newVersion} (iOS: ${newBuildNumber}, Android: ${newVersionCode})`
  );
}

/**
 * Update package.json
 */
function updatePackageJson(newVersion) {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ Updated package.json: v${newVersion}`);
}

/**
 * Create git tag
 */
function createGitTag(version) {
  const { execSync } = require('child_process');

  try {
    // Check if git is available
    execSync('git --version', { stdio: 'ignore' });

    // Create tag
    const tagName = `mobile-v${version}`;
    execSync(`git tag -a ${tagName} -m "Mobile app version ${version}"`, { stdio: 'inherit' });
    console.log(`✅ Created git tag: ${tagName}`);
    console.log(`   Push with: git push origin ${tagName}`);
  } catch (error) {
    console.log('⚠️  Git not available or command failed. Skipping tag creation.');
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch';

  if (!['major', 'minor', 'patch'].includes(versionType)) {
    console.error('❌ Invalid version type. Use: major, minor, or patch');
    process.exit(1);
  }

  try {
    // Read current versions
    const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    const currentVersion = appJson.expo.version;
    const currentBuildNumber = parseInt(appJson.expo.ios?.buildNumber || '1', 10);
    const currentVersionCode = appJson.expo.android?.versionCode || 1;

    // Calculate new versions
    const newVersion = incrementVersion(currentVersion, versionType);
    const newBuildNumber = currentBuildNumber + 1;
    const newVersionCode = currentVersionCode + 1;

    console.log('\n📱 Version Bump');
    console.log('==============');
    console.log(
      `Current: v${currentVersion} (iOS: ${currentBuildNumber}, Android: ${currentVersionCode})`
    );
    console.log(`New:     v${newVersion} (iOS: ${newBuildNumber}, Android: ${newVersionCode})`);
    console.log(`Type:    ${versionType}`);
    console.log('');

    // Update files
    updateAppJson(newVersion, newBuildNumber, newVersionCode);
    updatePackageJson(newVersion);

    // Create git tag
    createGitTag(newVersion);

    console.log('\n✅ Version bump complete!');
    console.log('\nNext steps:');
    console.log('1. Review changes: git diff');
    console.log(
      '2. Commit changes: git add . && git commit -m "Bump version to v' + newVersion + '"'
    );
    console.log('3. Push changes: git push origin main');
    console.log('4. Push tag: git push origin mobile-v' + newVersion);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
