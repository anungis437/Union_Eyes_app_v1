import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  generateExcel,
  generateMultiSheetExcel,
  generateFinancialExcel,
  generateMembershipRoster,
  generateClaimsExcel,
  generateRemittanceExcel,
  generateTrainingReportExcel,
} from '@/lib/utils/excel-generator';

async function loadWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

describe('Excel Generator', () => {
  it('should generate a single-sheet workbook with headers and data', async () => {
    const buffer = await generateExcel({
      title: 'Roster',
      data: [
        { name: 'Alex', joinedAt: new Date('2025-01-02') },
        { name: 'Jordan', joinedAt: new Date('2025-01-03') },
      ],
      columns: [
        { header: 'Name', key: 'name' },
        { header: 'Joined', key: 'joinedAt', format: 'yyyy-mm-dd' },
      ],
      sheetName: 'Members',
      styles: { alternateRows: true },
    });

    const workbook = await loadWorkbook(buffer);
    const sheet = workbook.getWorksheet('Members');

    expect(sheet).toBeDefined();
    expect(sheet?.getRow(1).getCell(1).value).toBe('Name');
    expect(sheet?.getRow(2).getCell(1).value).toBe('Alex');
  });

  it('should generate a multi-sheet workbook', async () => {
    const buffer = await generateMultiSheetExcel({
      filename: 'multi',
      sheets: [
        {
          name: 'Summary',
          data: [{ total: 2 }],
          columns: [{ header: 'Total', key: 'total' }],
        },
        {
          name: 'Details',
          data: [{ id: 'A1' }],
          columns: [{ header: 'ID', key: 'id' }],
        },
      ],
    });

    const workbook = await loadWorkbook(buffer);
    expect(workbook.getWorksheet('Summary')).toBeDefined();
    expect(workbook.getWorksheet('Details')).toBeDefined();
  });

  it('should generate template workbooks', async () => {
    const financialBuffer = await generateFinancialExcel({
      summary: { period: '2025-01', revenue: 100, expenses: 50, net: 50 },
      transactions: [{ date: '2025-01-01', description: 'Dues', category: 'Dues', amount: 100, type: 'credit' }],
      categories: [{ category: 'Dues', total: 100, count: 1 }],
    });

    const remittanceBuffer = await generateRemittanceExcel({
      organizationInfo: { name: 'Local 123' },
      remittances: [{ memberId: 'M1', memberName: 'Alex', duesAmount: 10, perCapita: 2, period: '2025-01', status: 'paid' }],
      summary: { totalMembers: 1, totalDues: 10, totalPerCapita: 2, period: '2025-01' },
    });

    const trainingBuffer = await generateTrainingReportExcel({
      programs: [{ name: 'Safety', type: 'course', duration: 1, enrollmentCount: 1, completionCount: 1 }],
      enrollments: [{ memberName: 'Alex', programName: 'Safety', status: 'active', progress: 0.5, enrolledDate: '2025-01-01' }],
      completions: [{ memberName: 'Alex', programName: 'Safety', completedDate: '2025-01-10', score: 95, certificateNumber: 'C-1' }],
    });

    const financialWorkbook = await loadWorkbook(financialBuffer);
    expect(financialWorkbook.getWorksheet('Summary')).toBeDefined();
    expect(financialWorkbook.getWorksheet('Transactions')).toBeDefined();
    expect(financialWorkbook.getWorksheet('Categories')).toBeDefined();

    const remittanceWorkbook = await loadWorkbook(remittanceBuffer);
    expect(remittanceWorkbook.getWorksheet('Remittances')).toBeDefined();
    expect(remittanceWorkbook.getWorksheet('Summary')).toBeDefined();

    const trainingWorkbook = await loadWorkbook(trainingBuffer);
    expect(trainingWorkbook.getWorksheet('Programs')).toBeDefined();
    expect(trainingWorkbook.getWorksheet('Enrollments')).toBeDefined();
    expect(trainingWorkbook.getWorksheet('Completions')).toBeDefined();
  });

  it('should generate roster and claims workbooks', async () => {
    const rosterBuffer = await generateMembershipRoster([
      { memberId: 'M1', name: 'Alex', email: 'alex@example.com', status: 'active', joinDate: new Date('2025-01-01'), local: '123', position: 'Member' },
    ]);

    const claimsBuffer = await generateClaimsExcel([
      { claimNumber: 'C1', subject: 'Overtime', memberName: 'Alex', status: 'open', priority: 'high', createdAt: new Date('2025-01-02'), resolvedAt: null },
    ]);

    const rosterWorkbook = await loadWorkbook(rosterBuffer);
    expect(rosterWorkbook.getWorksheet('Members')).toBeDefined();

    const claimsWorkbook = await loadWorkbook(claimsBuffer);
    expect(claimsWorkbook.getWorksheet('Claims')).toBeDefined();
  });
});
