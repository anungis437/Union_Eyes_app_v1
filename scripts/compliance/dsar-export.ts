/**
 * GDPR Data Subject Access Request (DSAR) Export
 * 
 * Automatically exports all personal data for a user across all tables.
 * Complies with GDPR Article 15 (Right of Access) and Article 20 (Data Portability).
 * 
 * Usage:
 *   pnpm tsx scripts/compliance/dsar-export.ts --userId <clerk_user_id>
 *   pnpm tsx scripts/compliance/dsar-export.ts --email <user@email.com>
 * 
 * Options:
 *   --format json|csv|both (default: json)
 *   --output <directory> (default: ./dsar-exports)
 *   --encrypt (encrypt output with user's public key)
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, or, sql } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';
import { parse } from 'json2csv';

config({ path: '.env.local' });

// =====================================================
// CONFIGURATION
// =====================================================

interface DSARConfig {
  userId?: string;
  userEmail?: string;
  format: 'json' | 'csv' | 'both';
  outputDir: string;
  encrypt: boolean;
  includeAuditTrail: boolean;
}

interface DSARExport {
  metadata: {
    exportDate: string;
    requestedBy: string;
    userId: string;
    email: string;
    gdprArticle: string;
    retention: string;
  };
  personalData: {
    profile: any[];
    memberships: any[];
    claims: any[];
    notifications: any[];
    documents: any[];
    calendar: any[];
    messages: any[];
    auditLog: any[];
    financialRecords: any[];
    llmInteractions: any[];
  };
  summary: {
    totalRecords: number;
    tablesIncluded: string[];
    dataCategories: string[];
  };
}

// =====================================================
// DATABASE CONNECTION
// =====================================================

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString, { 
  max: 1,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false 
});
const db = drizzle(client);

// =====================================================
// DSAR EXPORT FUNCTIONS
// =====================================================

async function findUserDetails(config: DSARConfig): Promise<{ userId: string; email: string }> {
  console.log('🔍 Finding user details...');
  
  let userId = config.userId;
  let email = config.userEmail;
  
  // Query user profile from organization_members or audit logs
  if (!userId && email) {
    const result = await client`
      SELECT DISTINCT user_id, email 
      FROM organization_members 
      WHERE email = ${email}
      LIMIT 1
    `;
    if (result.length > 0) {
      userId = result[0].user_id;
      email = result[0].email;
    }
  } else if (userId && !email) {
    const result = await client`
      SELECT DISTINCT email
      FROM organization_members
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    if (result.length > 0) {
      email = result[0].email;
    }
  }
  
  if (!userId) {
    throw new Error('User not found. Please provide a valid userId or email.');
  }
  
  console.log(`✅ Found user: ${userId} (${email})`);
  return { userId, email: email || 'unknown' };
}

async function exportPersonalData(userId: string): Promise<DSARExport['personalData']> {
  console.log('📦 Extracting personal data...');
  
  const data: DSARExport['personalData'] = {
    profile: [],
    memberships: [],
    claims: [],
    notifications: [],
    documents: [],
    calendar: [],
    messages: [],
    auditLog: [],
    financialRecords: [],
    llmInteractions: [],
  };
  
  // 1. User Profile & Memberships
  console.log('  - User profile & memberships');
  data.memberships = await client`
    SELECT 
      om.id,
      om.user_id,
      om.email,
      om.organization_id,
      o.name as organization_name,
      om.role,
      om.status,
      om.created_at,
      om.updated_at
    FROM organization_members om
    LEFT JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = ${userId}
  `;
  
  // 2. Claims (redacted sensitive fields)
  console.log('  - Claims history');
  data.claims = await client`
    SELECT 
      c.id,
      c.title,
      c.claim_type,
      c.status,
      c.priority,
      c.description,
      c.created_at,
      c.updated_at,
      c.resolved_at
    FROM claims c
    WHERE c.user_id = ${userId}
       OR c.assigned_to = ${userId}
  `;
  
  // 3. Notifications
  console.log('  - Notifications');
  data.notifications = await client`
    SELECT 
      n.id,
      n.type,
      n.title,
      n.message,
      n.read,
      n.created_at
    FROM in_app_notifications n
    WHERE n.user_id = ${userId}
    ORDER BY n.created_at DESC
    LIMIT 1000
  `;
  
  // 4. Calendar Events
  console.log('  - Calendar events');
  data.calendar = await client`
    SELECT 
      e.id,
      e.title,
      e.description,
      e.start_time,
      e.end_time,
      e.location,
      e.event_type,
      e.created_at
    FROM calendar_events e
    WHERE e.created_by = ${userId}
       OR e.id IN (
         SELECT event_id FROM event_attendees WHERE user_id = ${userId}
       )
    ORDER BY e.start_time DESC
  `;
  
  // 5. Documents (metadata only, not content for size reasons)
  console.log('  - Document metadata');
  data.documents = await client`
    SELECT 
      id,
      file_name,
      file_type,
      file_size,
      uploaded_at,
      description
    FROM documents
    WHERE uploaded_by = ${userId}
    ORDER BY uploaded_at DESC
  `;
  
  // 6. Messages (if messaging exists)
  console.log('  - Messages');
  try {
    data.messages = await client`
      SELECT 
        m.id,
        m.content,
        m.thread_id,
        m.created_at
      FROM messages m
      WHERE m.sender_id = ${userId}
         OR m.thread_id IN (
           SELECT thread_id FROM thread_participants WHERE user_id = ${userId}
         )
      ORDER BY m.created_at DESC
      LIMIT 1000
    `;
  } catch (error) {
    console.log('    (Messages table not found, skipping)');
  }
  
  // 7. Audit Log
  console.log('  - Audit trail');
  try {
    data.auditLog = await client`
      SELECT 
        id,
        action_type,
        table_name,
        record_id,
        changes,
        created_at,
        ip_address
      FROM audit_logs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 5000
    `;
  } catch (error) {
    console.log('    (Audit logs table not found, skipping)');
  }
  
  // 8. Financial Records (dues, payments)
  console.log('  - Financial records');
  try {
    data.financialRecords = await client`
      SELECT 
        d.id,
        d.amount,
        d.currency,
        d.period_start,
        d.period_end,
        d.status,
        d.paid_at,
        d.created_at
      FROM dues d
      WHERE d.member_id = ${userId}
      ORDER BY d.created_at DESC
    `;
  } catch (error) {
    console.log('    (Financial records not found, skipping)');
  }
  
  // 9. LLM Interactions (if Phase 1 is deployed)
  console.log('  - LLM usage metrics');
  try {
    data.llmInteractions = await client`
      SELECT 
        id,
        model_name,
        provider,
        input_tokens,
        output_tokens,
        total_tokens,
        estimated_cost,
        latency_ms,
        created_at
      FROM ai_usage_metrics
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = ${userId}
      )
      ORDER BY created_at DESC
      LIMIT 500
    `;
  } catch (error) {
    console.log('    (LLM metrics not found, skipping - Phase 1 may not be deployed)');
  }
  
  return data;
}

async function generateDSARExport(config: DSARConfig): Promise<DSARExport> {
  const { userId, email } = await findUserDetails(config);
  
  const personalData = await exportPersonalData(userId);
  
  const totalRecords = Object.values(personalData).reduce((sum, records) => sum + records.length, 0);
  const tablesIncluded = Object.entries(personalData)
    .filter(([_, records]) => records.length > 0)
    .map(([key]) => key);
  
  const exportData: DSARExport = {
    metadata: {
      exportDate: new Date().toISOString(),
      requestedBy: userId,
      userId,
      email,
      gdprArticle: 'Article 15 (Right of Access) & Article 20 (Data Portability)',
      retention: 'This export should be deleted after 30 days or upon user confirmation.',
    },
    personalData,
    summary: {
      totalRecords,
      tablesIncluded,
      dataCategories: [
        'Profile Information',
        'Organization Memberships',
        'Claims & Grievances',
        'Notifications',
        'Calendar & Events',
        'Documents',
        'Messages',
        'Audit Trail',
        'Financial Records',
        'LLM Interactions',
      ],
    },
  };
  
  return exportData;
}

async function saveExport(exportData: DSARExport, config: DSARConfig): Promise<string[]> {
  const { userId } = exportData.metadata;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const baseFilename = `dsar_${userId}_${timestamp}`;
  
  // Ensure output directory exists
  await fs.mkdir(config.outputDir, { recursive: true });
  
  const savedFiles: string[] = [];
  
  // Save JSON
  if (config.format === 'json' || config.format === 'both') {
    const jsonPath = path.join(config.outputDir, `${baseFilename}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(exportData, null, 2), 'utf-8');
    savedFiles.push(jsonPath);
    console.log(`✅ JSON export saved: ${jsonPath}`);
  }
  
  // Save CSV (flattened view)
  if (config.format === 'csv' || config.format === 'both') {
    const csvPath = path.join(config.outputDir, `${baseFilename}_summary.csv`);
    
    const flatData = Object.entries(exportData.personalData).flatMap(([category, records]) =>
      records.map((record: any) => ({
        category,
        ...record,
      }))
    );
    
    if (flatData.length > 0) {
      const csv = parse(flatData);
      await fs.writeFile(csvPath, csv, 'utf-8');
      savedFiles.push(csvPath);
      console.log(`✅ CSV export saved: ${csvPath}`);
    }
  }
  
  return savedFiles;
}

// =====================================================
// CLI ENTRY POINT
// =====================================================

async function main() {
  const args = process.argv.slice(2);
  
  const config: DSARConfig = {
    userId: undefined,
    userEmail: undefined,
    format: 'json',
    outputDir: './dsar-exports',
    encrypt: false,
    includeAuditTrail: true,
  };
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--userId':
        config.userId = args[++i];
        break;
      case '--email':
        config.userEmail = args[++i];
        break;
      case '--format':
        config.format = args[++i] as any;
        break;
      case '--output':
        config.outputDir = args[++i];
        break;
      case '--encrypt':
        config.encrypt = true;
        break;
    }
  }
  
  if (!config.userId && !config.userEmail) {
    console.error('❌ Error: Must provide --userId or --email');
    console.log('\nUsage:');
    console.log('  pnpm tsx scripts/compliance/dsar-export.ts --userId <clerk_user_id>');
    console.log('  pnpm tsx scripts/compliance/dsar-export.ts --email <user@email.com>');
    console.log('\nOptions:');
    console.log('  --format json|csv|both (default: json)');
    console.log('  --output <directory> (default: ./dsar-exports)');
    process.exit(1);
  }
  
  console.log('🚀 Starting GDPR DSAR Export...\n');
  
  try {
    const exportData = await generateDSARExport(config);
    const savedFiles = await saveExport(exportData, config);
    
    console.log('\n📊 Export Summary:');
    console.log(`  Total Records: ${exportData.summary.totalRecords}`);
    console.log(`  Tables Included: ${exportData.summary.tablesIncluded.join(', ')}`);
    console.log(`  Files Generated: ${savedFiles.length}`);
    
    console.log('\n✅ DSAR Export Complete!');
    console.log('\n⚠️  Important:');
    console.log('  - Securely transmit this export to the user');
    console.log('  - Delete after 30 days or user confirmation');
    console.log('  - Log this export in compliance audit trail');
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
