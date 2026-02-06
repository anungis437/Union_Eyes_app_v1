import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function cleanup() {
  try {
    console.log('Dropping all pension/hw tables...');
    await sql`DROP TABLE IF EXISTS pension_plans, pension_hours_banks, pension_contributions, pension_benefit_claims, pension_actuarial_valuations, hw_benefit_plans, hw_benefit_enrollments, hw_benefit_claims, trust_compliance_reports CASCADE`;
    console.log('✅ Dropped all pension tables');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

cleanup();
