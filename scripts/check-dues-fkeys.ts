import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL!;
const client =postgres(connectionString, {
  onnotice: () => {}, // Suppress notices
});
const db = drizzle(client);

async function checkDuesTransactionsForeignKeys() {
  console.log('=== Checking dues_transactions Foreign Keys ===\n');

  try {
    const fks = await db.execute(sql`
      SELECT
        conname AS constraint_name,
        conrelid::regclass AS table_name,
        a.attname AS column_name,
        confrelid::regclass AS foreign_table,
        af.attname AS foreign_column
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
      JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
      WHERE c.contype = 'f'
      AND conrelid = 'dues_transactions'::regclass
    `);

    console.log('Foreign keys on dues_transactions:');
    fks.forEach((fk: any) => {
      console.log(`  ${fk.constraint_name}: ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table}.${fk.foreign_column}`);
    });

    if (fks.length === 0) {
      console.log('  No foreign keys found on dues_transactions table');
    }

  } catch (error: unknown) {
    console.error('\n❌ Error:', error.message || error);
  } finally {
    await client.end();
  }
}

checkDuesTransactionsForeignKeys();
