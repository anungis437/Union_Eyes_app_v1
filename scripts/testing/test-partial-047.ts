import postgres from 'postgres';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function testPartial() {
  try {
    const fullSql = readFileSync('d:\\APPS\\union-claims-standalone\\database\\migrations\\047_pension_hw_trust_system.sql', 'utf-8');
    
    // Test progressively larger chunks at logical breakpoints
    for (const lineCount of [105, 180, 250, 350, 450, 700, 900, 1337]) {
      const lines = fullSql.split('\n');
      const partial = lines.slice(0, lineCount).join('\n');
      
      console.log(`\nTesting first ${lineCount} lines...`);
      
      try {
        await sql.unsafe(partial);
        console.log(`✅ First ${lineCount} lines executed successfully`);
      } catch (error: unknown) {
        console.error(`❌ Error at ${lineCount} lines:`, error.message);
        console.error('Position:', error.position);
        console.error(`Around line ${lineCount}:`, lines.slice(lineCount - 3, lineCount + 1).join('\n'));
        break; // Stop at first error
      }
    }
  } finally {
    await sql.end();
  }
}

testPartial();
