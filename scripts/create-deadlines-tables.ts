import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function createDeadlinesTables() {
  console.log('=== Creating Deadlines Tables and View ===\n');

  try {
    // 1. Create deadline_rules table
    console.log('1. Creating deadline_rules table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS deadline_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        rule_name TEXT NOT NULL,
        rule_code TEXT NOT NULL,
        description TEXT,
        claim_type TEXT,
        priority_level TEXT,
        step_number INTEGER,
        days_from_event INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        business_days_only BOOLEAN DEFAULT true,
        allows_extension BOOLEAN DEFAULT false,
        max_extension_days INTEGER DEFAULT 0,
        requires_approval BOOLEAN DEFAULT false,
        escalate_to_role TEXT,
        escalation_delay_days INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        is_system_rule BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, rule_code)
      )
    `);
    console.log('   ✅ deadline_rules table created');

    // 2. Create claim_deadlines table
    console.log('\n2. Creating claim_deadlines table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS claim_deadlines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        deadline_rule_id UUID REFERENCES deadline_rules(id),
        deadline_name TEXT NOT NULL,
        deadline_type TEXT NOT NULL,
        event_date DATE NOT NULL,
        original_deadline DATE NOT NULL,
        current_deadline DATE NOT NULL,
        completed_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'medium',
        extension_count INTEGER DEFAULT 0,
        total_extension_days INTEGER DEFAULT 0,
        last_extension_date DATE,
        last_extension_reason TEXT,
        completed_by TEXT,
        completion_notes TEXT,
        is_overdue BOOLEAN DEFAULT false,
        days_until_due INTEGER,
        days_overdue INTEGER DEFAULT 0,
        escalated_at TIMESTAMPTZ,
        escalated_to TEXT,
        alert_count INTEGER DEFAULT 0,
        last_alert_sent TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✅ claim_deadlines table created');

    // 3. Create deadline_extensions table
    console.log('\n3. Creating deadline_extensions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS deadline_extensions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deadline_id UUID NOT NULL REFERENCES claim_deadlines(id),
        tenant_id UUID NOT NULL,
        requested_by TEXT NOT NULL,
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        requested_days INTEGER NOT NULL,
        request_reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        requires_approval BOOLEAN DEFAULT false,
        approved_by TEXT,
        approval_decision_at TIMESTAMPTZ,
        approval_notes TEXT,
        new_deadline DATE,
        days_granted INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✅ deadline_extensions table created');

    // 4. Create deadline_alerts table
    console.log('\n4. Creating deadline_alerts table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS deadline_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deadline_id UUID NOT NULL REFERENCES claim_deadlines(id),
        tenant_id UUID NOT NULL,
        alert_type TEXT NOT NULL,
        alert_severity TEXT NOT NULL,
        alert_trigger TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        recipient_role TEXT,
        delivery_method TEXT NOT NULL,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        delivered_at TIMESTAMPTZ,
        delivery_status TEXT DEFAULT 'pending',
        delivery_error TEXT,
        viewed_at TIMESTAMPTZ,
        acknowledged_at TIMESTAMPTZ,
        action_taken TEXT,
        action_taken_at TIMESTAMPTZ,
        subject TEXT,
        message TEXT,
        action_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✅ deadline_alerts table created');

    // 5. Create holidays table
    console.log('\n5. Creating holidays table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS holidays (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        holiday_date DATE NOT NULL,
        holiday_name TEXT NOT NULL,
        holiday_type TEXT NOT NULL,
        is_recurring BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✅ holidays table created');

    // 6. Create indexes
    console.log('\n6. Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_claim_deadlines_claim_id ON claim_deadlines(claim_id);
      CREATE INDEX IF NOT EXISTS idx_claim_deadlines_tenant_id ON claim_deadlines(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_claim_deadlines_status ON claim_deadlines(status);
      CREATE INDEX IF NOT EXISTS idx_claim_deadlines_current_deadline ON claim_deadlines(current_deadline);
      CREATE INDEX IF NOT EXISTS idx_deadline_rules_tenant_id ON deadline_rules(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_deadline_alerts_deadline_id ON deadline_alerts(deadline_id);
      CREATE INDEX IF NOT EXISTS idx_deadline_extensions_deadline_id ON deadline_extensions(deadline_id);
    `);
    console.log('   ✅ Indexes created');

    // 7. Create v_critical_deadlines view
    console.log('\n7. Creating v_critical_deadlines view...');
    await db.execute(sql`
      CREATE OR REPLACE VIEW v_critical_deadlines AS
      SELECT 
        cd.*,
        CASE 
          WHEN cd.current_deadline < CURRENT_DATE THEN true
          ELSE false
        END as is_overdue,
        CASE 
          WHEN cd.current_deadline < CURRENT_DATE 
          THEN CURRENT_DATE - cd.current_deadline
          ELSE 0
        END as days_overdue_calc,
        CASE 
          WHEN cd.current_deadline >= CURRENT_DATE 
          THEN cd.current_deadline - CURRENT_DATE
          ELSE NULL
        END as days_until_due_calc
      FROM claim_deadlines cd
      WHERE cd.status IN ('pending', 'extended')
        AND (
          cd.current_deadline < CURRENT_DATE 
          OR cd.current_deadline <= CURRENT_DATE + INTERVAL '3 days'
        )
    `);
    console.log('   ✅ v_critical_deadlines view created');

    console.log('\n✅ All deadlines tables and view created successfully!');

  } catch (error) {
    console.error('\n❌ Error creating tables:', error);
  } finally {
    await client.end();
  }
}

createDeadlinesTables();
