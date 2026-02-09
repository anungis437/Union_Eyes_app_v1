#!/usr/bin/env node

/**
 * Generate Changelog from Git History
 *
 * Generates a changelog based on git commit messages
 *
 * Usage:
 *   node scripts/generate-changelog.js [from-tag] [to-tag]
 *   node scripts/generate-changelog.js mobile-v1.0.0 HEAD
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MOBILE_DIR = path.join(__dirname, '..');
const CHANGELOG_PATH = path.join(MOBILE_DIR, 'CHANGELOG.md');

/**
 * Get git logs between two refs
 */
function getGitLogs(from, to) {
  try {
    const command = `git log ${from}..${to} --pretty=format:"%h|%s|%an|%ad" --date=short --no-merges -- mobile/`;
    const output = execSync(command, { encoding: 'utf8' });
    return output
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [hash, subject, author, date] = line.split('|');
        return { hash, subject, author, date };
      });
  } catch (error) {
    console.error('Error getting git logs:', error.message);
    return [];
  }
}

/**
 * Categorize commits
 */
function categorizeCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    improvements: [],
    chore: [],
    docs: [],
    other: [],
  };

  commits.forEach((commit) => {
    const subject = commit.subject.toLowerCase();

    if (subject.startsWith('feat:') || subject.includes('feature')) {
      categories.features.push(commit);
    } else if (subject.startsWith('fix:') || subject.includes('bug') || subject.includes('fixed')) {
      categories.fixes.push(commit);
    } else if (
      subject.startsWith('improvement:') ||
      subject.startsWith('perf:') ||
      subject.includes('improve')
    ) {
      categories.improvements.push(commit);
    } else if (subject.startsWith('chore:') || subject.includes('chore')) {
      categories.chore.push(commit);
    } else if (subject.startsWith('docs:') || subject.includes('documentation')) {
      categories.docs.push(commit);
    } else {
      categories.other.push(commit);
    }
  });

  return categories;
}

/**
 * Format commit for changelog
 */
function formatCommit(commit) {
  // Remove conventional commit prefixes
  let subject = commit.subject
    .replace(/^(feat|fix|docs|style|refactor|perf|test|chore|improvement):\s*/i, '')
    .trim();

  // Capitalize first letter
  subject = subject.charAt(0).toUpperCase() + subject.slice(1);

  return `- ${subject} ([${commit.hash}](../commit/${commit.hash}))`;
}

/**
 * Generate changelog content
 */
function generateChangelog(fromTag, toTag) {
  const commits = getGitLogs(fromTag, toTag);

  if (commits.length === 0) {
    return "## What's Changed\n\nNo changes found in git history.";
  }

  const categories = categorizeCommits(commits);
  let changelog = "## What's Changed\n\n";

  // Features
  if (categories.features.length > 0) {
    changelog += '### 🎉 New Features\n\n';
    categories.features.forEach((commit) => {
      changelog += formatCommit(commit) + '\n';
    });
    changelog += '\n';
  }

  // Bug Fixes
  if (categories.fixes.length > 0) {
    changelog += '### 🐛 Bug Fixes\n\n';
    categories.fixes.forEach((commit) => {
      changelog += formatCommit(commit) + '\n';
    });
    changelog += '\n';
  }

  // Improvements
  if (categories.improvements.length > 0) {
    changelog += '### ⚡ Improvements\n\n';
    categories.improvements.forEach((commit) => {
      changelog += formatCommit(commit) + '\n';
    });
    changelog += '\n';
  }

  // Documentation
  if (categories.docs.length > 0) {
    changelog += '### 📝 Documentation\n\n';
    categories.docs.forEach((commit) => {
      changelog += formatCommit(commit) + '\n';
    });
    changelog += '\n';
  }

  // Other Changes
  const otherChanges = [...categories.chore, ...categories.other];
  if (otherChanges.length > 0) {
    changelog += '### 🔧 Other Changes\n\n';
    otherChanges.forEach((commit) => {
      changelog += formatCommit(commit) + '\n';
    });
    changelog += '\n';
  }

  // Contributors
  const contributors = [...new Set(commits.map((c) => c.author))];
  if (contributors.length > 0) {
    changelog += '### 👥 Contributors\n\n';
    changelog += `Thank you to ${contributors.map((c) => `@${c}`).join(', ')} for contributing to this release!\n\n`;
  }

  // Statistics
  changelog += '---\n\n';
  changelog += `**Full Changelog**: ${fromTag}...${toTag}\n`;
  changelog += `**Total Commits**: ${commits.length}\n`;

  return changelog;
}

/**
 * Get latest tag
 */
function getLatestTag() {
  try {
    const output = execSync('git describe --tags --abbrev=0 --match "mobile-v*"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return output.trim();
  } catch (error) {
    // No tags found
    return null;
  }
}

/**
 * Get app version from app.json
 */
function getAppVersion() {
  const appJsonPath = path.join(MOBILE_DIR, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  return appJson.expo.version;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const toTag = args[1] || 'HEAD';
  let fromTag = args[0];

  // If no from tag specified, use latest tag
  if (!fromTag) {
    fromTag = getLatestTag();
    if (!fromTag) {
      console.error('❌ No previous version tag found. Please specify a from-tag.');
      console.error('   Usage: node scripts/generate-changelog.js [from-tag] [to-tag]');
      process.exit(1);
    }
  }

  console.log('📝 Generating Changelog');
  console.log('======================');
  console.log(`From: ${fromTag}`);
  console.log(`To:   ${toTag}`);
  console.log('');

  try {
    const version = getAppVersion();
    const changelog = generateChangelog(fromTag, toTag);

    // Prepend version header
    const fullChangelog = `# UnionEyes Mobile v${version}\n\n${changelog}`;

    // Write to file
    fs.writeFileSync(CHANGELOG_PATH, fullChangelog);
    console.log(`✅ Changelog written to: ${CHANGELOG_PATH}`);

    // Also output to stdout for CI/CD
    console.log('\n' + fullChangelog);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
