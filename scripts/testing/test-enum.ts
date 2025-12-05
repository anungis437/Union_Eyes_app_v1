import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function testEnum() {
  try {
    await sql`
      DROP TYPE IF EXISTS hw_plan_type CASCADE;
      CREATE TYPE hw_plan_type AS ENUM (
        'health_medical',
        'dental',
        'vision',
        'prescription',
        'disability_short_term',
        'disability_long_term',
        'life_insurance',
        'accidental_death',
        'critical_illness',
        'employee_assistance'
      );
    `;
    console.log('✅ Enum created successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

testEnum();
