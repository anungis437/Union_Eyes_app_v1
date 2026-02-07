import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ChartOfAccountsService, 
  chartOfAccounts,
  type AccountType,
  type AccountCategory,
  type CLCAccount
} from '@/services/clc/chart-of-accounts';

describe('ChartOfAccountsService', () => {
  let service: ChartOfAccountsService;

  beforeEach(() => {
    service = new ChartOfAccountsService();
  });

  describe('getAllAccounts', () => {
    it('should return all CLC accounts', () => {
      const accounts = service.getAllAccounts();
      
      expect(accounts).toBeDefined();
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThan(0);
    });

    it('should return accounts with correct structure', () => {
      const accounts = service.getAllAccounts();
      const firstAccount = accounts[0];
      
      expect(firstAccount).toHaveProperty('code');
      expect(firstAccount).toHaveProperty('name');
      expect(firstAccount).toHaveProperty('type');
      expect(firstAccount).toHaveProperty('category');
      expect(firstAccount).toHaveProperty('isActive');
      expect(firstAccount).toHaveProperty('sortOrder');
    });

    it('should include revenue accounts (4000 series)', () => {
      const accounts = service.getAllAccounts();
      const revenueAccounts = accounts.filter(acc => acc.code.startsWith('4'));
      
      expect(revenueAccounts.length).toBeGreaterThan(0);
    });

    it('should include expense accounts (5000 and 6000 series)', () => {
      const accounts = service.getAllAccounts();
      const expenseAccounts = accounts.filter(acc => 
        acc.code.startsWith('5') || acc.code.startsWith('6')
      );
      
      expect(expenseAccounts.length).toBeGreaterThan(0);
    });

    it('should include asset accounts (7000 series)', () => {
      const accounts = service.getAllAccounts();
      const assetAccounts = accounts.filter(acc => acc.code.startsWith('7'));
      
      expect(assetAccounts.length).toBeGreaterThan(0);
    });
  });

  describe('getAccountByCode', () => {
    it('should return account for valid code', () => {
      const account = service.getAccountByCode('4000');
      
      expect(account).toBeDefined();
      expect(account?.code).toBe('4000');
      expect(account?.name).toBe('Revenue');
    });

    it('should return per-capita revenue account', () => {
      const account = service.getAccountByCode('4100-001');
      
      expect(account).toBeDefined();
      expect(account?.code).toBe('4100-001');
      expect(account?.name).toBe('CLC Per-Capita Tax');
      expect(account?.type).toBe('revenue');
    });

    it('should return undefined for non-existent code', () => {
      const account = service.getAccountByCode('9999');
      
      expect(account).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const account = service.getAccountByCode('');
      
      expect(account).toBeUndefined();
    });

    it('should handle sub-account codes correctly', () => {
      const account = service.getAccountByCode('5100-001');
      
      expect(account).toBeDefined();
      expect(account?.code).toBe('5100-001');
      expect(account?.name).toBe('Officer Salaries');
    });
  });

  describe('getAccountsByType', () => {
    it('should return all revenue accounts', () => {
      const accounts = service.getAccountsByType('revenue');
      
      expect(accounts).toBeDefined();
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.every(acc => acc.type === 'revenue')).toBe(true);
    });

    it('should return all expense accounts', () => {
      const accounts = service.getAccountsByType('expense');
      
      expect(accounts).toBeDefined();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.every(acc => acc.type === 'expense')).toBe(true);
    });

    it('should return all asset accounts', () => {
      const accounts = service.getAccountsByType('asset');
      
      expect(accounts).toBeDefined();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.every(acc => acc.type === 'asset')).toBe(true);
    });

    it('should return empty array for non-existent type', () => {
      const accounts = service.getAccountsByType('invalid' as AccountType);
      
      expect(accounts).toBeDefined();
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBe(0);
    });

    it('should return distinct account types', () => {
      const allAccounts = service.getAllAccounts();
      const uniqueTypes = new Set(allAccounts.map(acc => acc.type));
      
      expect(uniqueTypes.size).toBeGreaterThanOrEqual(3);
      expect(uniqueTypes.has('revenue')).toBe(true);
      expect(uniqueTypes.has('expense')).toBe(true);
      expect(uniqueTypes.has('asset')).toBe(true);
    });
  });

  describe('getAccountsByCategory', () => {
    it('should return per-capita revenue accounts', () => {
      const accounts = service.getAccountsByCategory('per_capita_revenue');
      
      expect(accounts).toBeDefined();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.every(acc => acc.category === 'per_capita_revenue')).toBe(true);
    });

    it('should return dues revenue accounts', () => {
      const accounts = service.getAccountsByCategory('dues_revenue');
      
      expect(accounts).toBeDefined();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.every(acc => acc.category === 'dues_revenue')).toBe(true);
    });

    it('should return salaries and wages accounts', () => {
      const accounts = service.getAccountsByCategory('salaries_wages');
      
      expect(accounts).toBeDefined();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.every(acc => acc.category === 'salaries_wages')).toBe(true);
    });

    it('should return legal and professional accounts', () => {
      const accounts = service.getAccountsByCategory('legal_professional');
      
      expect(accounts).toBeDefined();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.every(acc => acc.category === 'legal_professional')).toBe(true);
    });

    it('should return strike fund accounts', () => {
      const accounts = service.getAccountsByCategory('strike_fund');
      
      expect(accounts).toBeDefined();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.every(acc => acc.category === 'strike_fund')).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const accounts = service.getAccountsByCategory('invalid_category' as AccountCategory);
      
      expect(accounts).toBeDefined();
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBe(0);
    });
  });

  describe('getChildAccounts', () => {
    it('should return child accounts for parent 4000', () => {
      const children = service.getChildAccounts('4000');
      
      expect(children).toBeDefined();
      expect(Array.isArray(children)).toBe(true);
      expect(children.length).toBeGreaterThan(0);
      expect(children.every(acc => acc.parentCode === '4000')).toBe(true);
    });

    it('should return child accounts for parent 4100', () => {
      const children = service.getChildAccounts('4100');
      
      expect(children).toBeDefined();
      expect(children.length).toBeGreaterThan(0);
      expect(children.every(acc => acc.parentCode === '4100')).toBe(true);
      expect(children.some(acc => acc.code === '4100-001')).toBe(true);
    });

    it('should return child accounts for parent 5000', () => {
      const children = service.getChildAccounts('5000');
      
      expect(children).toBeDefined();
      expect(children.length).toBeGreaterThan(0);
      expect(children.every(acc => acc.parentCode === '5000')).toBe(true);
    });

    it('should return empty array for leaf account with no children', () => {
      const children = service.getChildAccounts('4100-001');
      
      expect(children).toBeDefined();
      expect(Array.isArray(children)).toBe(true);
      expect(children.length).toBe(0);
    });

    it('should return empty array for non-existent parent', () => {
      const children = service.getChildAccounts('9999');
      
      expect(children).toBeDefined();
      expect(Array.isArray(children)).toBe(true);
      expect(children.length).toBe(0);
    });
  });

  describe('getAccountMapping', () => {
    it('should return mapping for per-capita remittance', () => {
      const mapping = service.getAccountMapping('per_capita_remittance');
      
      expect(mapping).toBeDefined();
      expect(mapping?.transactionType).toBe('per_capita_remittance');
      expect(mapping?.debitAccount).toBe('5300');
      expect(mapping?.creditAccount).toBe('7100');
      expect(mapping?.description).toContain('per-capita');
    });

    it('should return mapping for per-capita received', () => {
      const mapping = service.getAccountMapping('per_capita_received');
      
      expect(mapping).toBeDefined();
      expect(mapping?.transactionType).toBe('per_capita_received');
      expect(mapping?.debitAccount).toBe('7100');
      expect(mapping?.creditAccount).toBe('4100-001');
    });

    it('should return mapping for dues collection', () => {
      const mapping = service.getAccountMapping('dues_collection');
      
      expect(mapping).toBeDefined();
      expect(mapping?.transactionType).toBe('dues_collection');
      expect(mapping?.debitAccount).toBe('7100');
      expect(mapping?.creditAccount).toBe('4200-001');
    });

    it('should return mapping for legal expense', () => {
      const mapping = service.getAccountMapping('legal_expense');
      
      expect(mapping).toBeDefined();
      expect(mapping?.transactionType).toBe('legal_expense');
      expect(mapping?.debitAccount).toBe('5200-001');
      expect(mapping?.creditAccount).toBe('7100');
    });

    it('should return mapping for salary payment', () => {
      const mapping = service.getAccountMapping('salary_payment');
      
      expect(mapping).toBeDefined();
      expect(mapping?.transactionType).toBe('salary_payment');
    });

    it('should return undefined for non-existent transaction type', () => {
      const mapping = service.getAccountMapping('invalid_transaction');
      
      expect(mapping).toBeUndefined();
    });
  });

  describe('getAllAccountMappings', () => {
    it('should return all account mappings', () => {
      const mappings = service.getAllAccountMappings();
      
      expect(mappings).toBeDefined();
      expect(Array.isArray(mappings)).toBe(true);
      expect(mappings.length).toBeGreaterThan(0);
    });

    it('should return mappings with correct structure', () => {
      const mappings = service.getAllAccountMappings();
      const firstMapping = mappings[0];
      
      expect(firstMapping).toHaveProperty('transactionType');
      expect(firstMapping).toHaveProperty('debitAccount');
      expect(firstMapping).toHaveProperty('creditAccount');
      expect(firstMapping).toHaveProperty('description');
    });

    it('should include per-capita mappings', () => {
      const mappings = service.getAllAccountMappings();
      const perCapitaMappings = mappings.filter(m => 
        m.transactionType.includes('per_capita')
      );
      
      expect(perCapitaMappings.length).toBeGreaterThan(0);
    });
  });

  describe('getPerCapitaRevenueAccount', () => {
    it('should return CLC per-capita tax revenue account', () => {
      const account = service.getPerCapitaRevenueAccount();
      
      expect(account).toBeDefined();
      expect(account.code).toBe('4100-001');
      expect(account.name).toBe('CLC Per-Capita Tax');
      expect(account.type).toBe('revenue');
      expect(account.category).toBe('per_capita_revenue');
    });

    it('should return account with StatCan code', () => {
      const account = service.getPerCapitaRevenueAccount();
      
      expect(account.statcanCode).toBe('REV-PER-CAPITA-CLC');
    });
  });

  describe('getPerCapitaExpenseAccount', () => {
    it('should return per-capita tax expense account', () => {
      const account = service.getPerCapitaExpenseAccount();
      
      expect(account).toBeDefined();
      expect(account.code).toBe('5300');
      expect(account.name).toBe('Per-Capita Tax Expense');
      expect(account.type).toBe('expense');
    });

    it('should return account with StatCan code', () => {
      const account = service.getPerCapitaExpenseAccount();
      
      expect(account.statcanCode).toBe('EXP-PER-CAPITA');
    });
  });

  describe('isValidAccountCode', () => {
    it('should validate 4-digit account codes', () => {
      expect(service.isValidAccountCode('4000')).toBe(true);
      expect(service.isValidAccountCode('5000')).toBe(true);
      expect(service.isValidAccountCode('7100')).toBe(true);
    });

    it('should validate sub-account codes with dash and 3 digits', () => {
      expect(service.isValidAccountCode('4100-001')).toBe(true);
      expect(service.isValidAccountCode('5200-001')).toBe(true);
      expect(service.isValidAccountCode('7100-999')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(service.isValidAccountCode('400')).toBe(false);
      expect(service.isValidAccountCode('40000')).toBe(false);
      expect(service.isValidAccountCode('4000-1')).toBe(false);
      expect(service.isValidAccountCode('4000-0001')).toBe(false);
      expect(service.isValidAccountCode('ABC123')).toBe(false);
      expect(service.isValidAccountCode('4000_001')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(service.isValidAccountCode('')).toBe(false);
    });

    it('should reject codes with letters', () => {
      expect(service.isValidAccountCode('A000')).toBe(false);
      expect(service.isValidAccountCode('4000-A01')).toBe(false);
    });
  });

  describe('getAccountPath', () => {
    it('should return path for root account', () => {
      const path = service.getAccountPath('4000');
      
      expect(path).toBe('4000');
    });

    it('should return path for two-level account', () => {
      const path = service.getAccountPath('4100');
      
      expect(path).toBe('4000 > 4100');
    });

    it('should return path for three-level account', () => {
      const path = service.getAccountPath('4100-001');
      
      expect(path).toBe('4000 > 4100 > 4100-001');
    });

    it('should return path for expense account hierarchy', () => {
      const path = service.getAccountPath('5200-001');
      
      expect(path).toContain('5000');
      expect(path).toContain('5200');
      expect(path).toContain('5200-001');
    });

    it('should return empty string for non-existent account', () => {
      const path = service.getAccountPath('9999');
      
      expect(path).toBe('');
    });

    it('should return empty string for empty code', () => {
      const path = service.getAccountPath('');
      
      expect(path).toBe('');
    });
  });

  describe('getAccountFullName', () => {
    it('should return name for root account', () => {
      const fullName = service.getAccountFullName('4000');
      
      expect(fullName).toBe('Revenue');
    });

    it('should return full name for two-level account', () => {
      const fullName = service.getAccountFullName('4100');
      
      expect(fullName).toBe('Revenue / Per-Capita Tax Revenue');
    });

    it('should return full name for three-level account', () => {
      const fullName = service.getAccountFullName('4100-001');
      
      expect(fullName).toBe('Revenue / Per-Capita Tax Revenue / CLC Per-Capita Tax');
    });

    it('should return full name for legal expense account', () => {
      const fullName = service.getAccountFullName('5200-001');
      
      expect(fullName).toContain('Operating Expenses');
      expect(fullName).toContain('Legal and Professional Fees');
      expect(fullName).toContain('Legal Counsel');
    });

    it('should return empty string for non-existent account', () => {
      const fullName = service.getAccountFullName('9999');
      
      expect(fullName).toBe('');
    });

    it('should return empty string for empty code', () => {
      const fullName = service.getAccountFullName('');
      
      expect(fullName).toBe('');
    });
  });

  describe('exportToJSON', () => {
    it('should return valid JSON string', () => {
      const json = service.exportToJSON();
      
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should export all accounts', () => {
      const json = service.exportToJSON();
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should include account properties', () => {
      const json = service.exportToJSON();
      const parsed = JSON.parse(json);
      const firstAccount = parsed[0];
      
      expect(firstAccount).toHaveProperty('code');
      expect(firstAccount).toHaveProperty('name');
      expect(firstAccount).toHaveProperty('type');
      expect(firstAccount).toHaveProperty('category');
    });

    it('should be formatted with indentation', () => {
      const json = service.exportToJSON();
      
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('exportToCSV', () => {
    it('should return CSV string with header', () => {
      const csv = service.exportToCSV();
      
      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Code,Name,Type,Category');
    });

    it('should include all expected columns', () => {
      const csv = service.exportToCSV();
      const header = csv.split('\n')[0];
      
      expect(header).toContain('Code');
      expect(header).toContain('Name');
      expect(header).toContain('Type');
      expect(header).toContain('Category');
      expect(header).toContain('StatCan Code');
      expect(header).toContain('Description');
      expect(header).toContain('Active');
      expect(header).toContain('Parent Code');
      expect(header).toContain('Sort Order');
    });

    it('should include account data rows', () => {
      const csv = service.exportToCSV();
      const lines = csv.split('\n');
      
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[1]).toContain('4000');
      expect(lines[1]).toContain('Revenue');
    });

    it('should quote text fields with spaces', () => {
      const csv = service.exportToCSV();
      
      expect(csv).toContain('"Revenue"');
      expect(csv).toContain('"Per-Capita Tax Revenue"');
    });

    it('should use Y/N for boolean active status', () => {
      const csv = service.exportToCSV();
      
      expect(csv).toMatch(/,Y,/);
    });

    it('should have correct number of columns in each row', () => {
      const csv = service.exportToCSV();
      const lines = csv.split('\n').filter(line => line.trim());
      const headerColumns = lines[0].split(',').length;
      
      // Check first few data rows have same column count
      for (let i = 1; i < Math.min(5, lines.length); i++) {
        const columns = lines[i].split(',').length;
        expect(columns).toBe(headerColumns);
      }
    });
  });
});

describe('chartOfAccounts singleton', () => {
  it('should be an instance of ChartOfAccountsService', () => {
    expect(chartOfAccounts).toBeInstanceOf(ChartOfAccountsService);
  });

  it('should have all service methods', () => {
    expect(typeof chartOfAccounts.getAllAccounts).toBe('function');
    expect(typeof chartOfAccounts.getAccountByCode).toBe('function');
    expect(typeof chartOfAccounts.getAccountsByType).toBe('function');
    expect(typeof chartOfAccounts.getAccountsByCategory).toBe('function');
    expect(typeof chartOfAccounts.getChildAccounts).toBe('function');
    expect(typeof chartOfAccounts.getAccountMapping).toBe('function');
    expect(typeof chartOfAccounts.getAllAccountMappings).toBe('function');
    expect(typeof chartOfAccounts.getPerCapitaRevenueAccount).toBe('function');
    expect(typeof chartOfAccounts.getPerCapitaExpenseAccount).toBe('function');
    expect(typeof chartOfAccounts.isValidAccountCode).toBe('function');
    expect(typeof chartOfAccounts.getAccountPath).toBe('function');
    expect(typeof chartOfAccounts.getAccountFullName).toBe('function');
    expect(typeof chartOfAccounts.exportToJSON).toBe('function');
    expect(typeof chartOfAccounts.exportToCSV).toBe('function');
  });

  it('should work correctly when called directly', () => {
    const accounts = chartOfAccounts.getAllAccounts();
    expect(accounts.length).toBeGreaterThan(0);
  });

  it('should return consistent results across calls', () => {
    const accounts1 = chartOfAccounts.getAllAccounts();
    const accounts2 = chartOfAccounts.getAllAccounts();
    
    expect(accounts1).toEqual(accounts2);
    expect(accounts1.length).toBe(accounts2.length);
  });
});
