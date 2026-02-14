/**
 * Global Setup for Playwright E2E Tests
 * 
 * Handles authentication and test environment preparation
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  
  console.log('🔧 Setting up E2E test environment...');
  
  // Create storage state directory if it doesn't exist
  const authDir = path.dirname(storageState as string || '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  // Authenticate different user types
  const browser = await chromium.launch();
  
  try {
    // Admin user authentication
    await authenticateUser(browser, {
      baseURL: baseURL || 'http://localhost:3000',
      username: process.env.E2E_ADMIN_EMAIL || 'admin@test.com',
      password: process.env.E2E_ADMIN_PASSWORD || 'Test123!@#',
      storageStatePath: '.auth/admin.json',
      role: 'admin',
    });
    
    // Member user authentication  
    await authenticateUser(browser, {
      baseURL: baseURL || 'http://localhost:3000',
      username: process.env.E2E_MEMBER_EMAIL || 'member@test.com',
      password: process.env.E2E_MEMBER_PASSWORD || 'Test123!@#',
      storageStatePath: '.auth/member.json',
      role: 'member',
    });
    
    // Officer user authentication
    await authenticateUser(browser, {
      baseURL: baseURL || 'http://localhost:3000',
      username: process.env.E2E_OFFICER_EMAIL || 'officer@test.com',
      password: process.env.E2E_OFFICER_PASSWORD || 'Test123!@#',
      storageStatePath: '.auth/officer.json',
      role: 'officer',
    });
    
    console.log('✅ E2E test environment ready');
  } catch (error) {
    console.error('❌ Failed to set up E2E environment:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function authenticateUser(browser: any, options: {
  baseURL: string;
  username: string;
  password: string;
  storageStatePath: string;
  role: string;
}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log(`🔐 Authenticating ${options.role} user...`);
    
    // Navigate to login page
    await page.goto(`${options.baseURL}/sign-in`);
    
    // Fill in credentials (adjust selectors based on your auth provider)
    await page.fill('input[name="email"], input[type="email"]', options.username);
    await page.fill('input[name="password"], input[type="password"]', options.password);
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL(`${options.baseURL}/dashboard`, { timeout: 10000 });
    
    // Save authenticated state
    await context.storageState({ path: options.storageStatePath });
    
    console.log(`✅ ${options.role} authenticated`);
  } catch (error) {
    console.warn(`⚠️  Could not authenticate ${options.role}:`, error);
    // Don't fail setup if authentication fails (tests will fail individually)
  } finally {
    await context.close();
  }
}

export default globalSetup;
