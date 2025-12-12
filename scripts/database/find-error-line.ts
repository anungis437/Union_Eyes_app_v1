import { readFile } from 'fs/promises';

async function findError() {
const sql = await readFile('database/migrations/044_clc_hierarchy_system.sql', 'utf8');
const position = 8196;

// Find line number
let lineNum = 1;
let charPos = 0;
const lines = sql.split('\n');

for (const line of lines) {
  charPos += line.length + 1; // +1 for newline
  if (charPos >= position) {
    console.log(`Position ${position} is on line ${lineNum}:`);
    console.log(line);
    console.log('\nContext:');
    for (let i = Math.max(0, lineNum - 5); i < Math.min(lines.length, lineNum + 5); i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
    break;
  }
  lineNum++;
}
}

findError();
