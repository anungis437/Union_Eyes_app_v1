import { db } from '../db/db';
import { sql } from 'drizzle-orm';

type ColumnTarget = {
  schema: string;
  table: string;
  column: string;
  expectedDataType: string;
  expectedUdt: string;
};

const targets: ColumnTarget[] = [
  { schema: 'public', table: 'claims', column: 'member_id', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'course_registrations', column: 'member_id', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'member_certifications', column: 'member_id', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'program_enrollments', column: 'member_id', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_assignments', column: 'assigned_to', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_assignments', column: 'assigned_by', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_documents', column: 'signed_by', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_documents', column: 'uploaded_by', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_documents', column: 'reviewed_by', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_settlements', column: 'proposed_by_user', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_settlements', column: 'responded_by_user', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_settlements', column: 'union_approved_by', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_settlements', column: 'management_approved_by', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_settlements', column: 'finalized_by', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_communications', column: 'from_user_id', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'grievance_communications', column: 'to_user_ids', expectedDataType: 'ARRAY', expectedUdt: '_varchar' },
  { schema: 'public', table: 'grievance_communications', column: 'recorded_by', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'public', table: 'traditional_knowledge_registry', column: 'primary_keeper_user_id', expectedDataType: 'character varying', expectedUdt: 'varchar' },
  { schema: 'tenant_management', table: 'tenant_configurations', column: 'updated_by', expectedDataType: 'character varying', expectedUdt: 'varchar' },
];

async function validateColumns() {
  const valuesSql = targets
    .map(
      (target) =>
        `('${target.schema}', '${target.table}', '${target.column}')`
    )
    .join(',');

  const result = await db.execute(
    sql.raw(`
      SELECT table_schema, table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE (table_schema, table_name, column_name) IN (${valuesSql})
    `)
  );

  const rows = Array.isArray(result) ? result : (result as any).rows ?? [];

  const foundKey = (row: any) =>
    `${row.table_schema}.${row.table_name}.${row.column_name}`;
  const foundMap = new Map<string, any>();
  rows.forEach((row: any) => {
    foundMap.set(foundKey(row), row);
  });

  const missing: ColumnTarget[] = [];
  const mismatched: Array<{ target: ColumnTarget; actual: any }> = [];

  for (const target of targets) {
    const key = `${target.schema}.${target.table}.${target.column}`;
    const actual = foundMap.get(key);
    if (!actual) {
      missing.push(target);
      continue;
    }

    const matchesType =
      actual.data_type === target.expectedDataType &&
      actual.udt_name === target.expectedUdt;

    if (!matchesType) {
      mismatched.push({ target, actual });
    }
  }

  if (missing.length === 0 && mismatched.length === 0) {
    console.log('✅ Clerk user ID columns are aligned with varchar(255).');
    return;
  }

  if (missing.length > 0) {
    console.log('\n❌ Missing expected columns:');
    missing.forEach((target) => {
      console.log(`  - ${target.schema}.${target.table}.${target.column}`);
    });
  }

  if (mismatched.length > 0) {
    console.log('\n❌ Column type mismatches:');
    mismatched.forEach(({ target, actual }) => {
      console.log(
        `  - ${target.schema}.${target.table}.${target.column}: ` +
          `expected ${target.expectedDataType}/${target.expectedUdt}, ` +
          `found ${actual.data_type}/${actual.udt_name}`
      );
    });
  }

  process.exit(1);
}

validateColumns().catch((error) => {
  console.error('❌ Clerk ID validation failed:', error);
  process.exit(1);
});
