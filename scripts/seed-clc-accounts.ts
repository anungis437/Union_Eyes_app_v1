/**
 * Seed CLC Standard Chart of Accounts
 * 
 * Generated from services/clc/chart-of-accounts.ts constant
 * 2026-02-12T07:12:52.837Z
 */

import { db } from '@/db/db';
import { chartOfAccounts } from '@/db/schema/domains/financial/chart-of-accounts';

const CLC_ACCOUNTS = [
  {
    "code": "4000",
    "name": "Revenue",
    "type": "revenue",
    "category": "dues_revenue",
    "description": "All revenue accounts",
    "parentCode": null,
    "statcanCode": null,
    "isActive": true,
    "sortOrder": 1000
  },
  {
    "code": "4100",
    "name": "Per-Capita Tax Revenue",
    "type": "revenue",
    "category": "per_capita_revenue",
    "description": "Monthly per-capita remittances from local unions",
    "parentCode": "4000",
    "statcanCode": "REV-PER-CAPITA",
    "isActive": true,
    "sortOrder": 1100
  },
  {
    "code": "4100-001",
    "name": "CLC Per-Capita Tax",
    "type": "revenue",
    "category": "per_capita_revenue",
    "description": "Per-capita tax remitted to CLC",
    "parentCode": "4100",
    "statcanCode": "REV-PER-CAPITA-CLC",
    "isActive": true,
    "sortOrder": 1101
  },
  {
    "code": "4100-002",
    "name": "Federation Per-Capita Tax",
    "type": "revenue",
    "category": "per_capita_revenue",
    "description": "Per-capita tax remitted to federation",
    "parentCode": "4100",
    "statcanCode": "REV-PER-CAPITA-FED",
    "isActive": true,
    "sortOrder": 1102
  },
  {
    "code": "4200",
    "name": "Membership Dues",
    "type": "revenue",
    "category": "dues_revenue",
    "description": "Regular membership dues collected",
    "parentCode": "4000",
    "statcanCode": "REV-DUES",
    "isActive": true,
    "sortOrder": 1200
  },
  {
    "code": "4200-001",
    "name": "Regular Membership Dues",
    "type": "revenue",
    "category": "dues_revenue",
    "description": "Monthly or bi-weekly dues from regular members",
    "parentCode": "4200",
    "statcanCode": "REV-DUES-REG",
    "isActive": true,
    "sortOrder": 1201
  },
  {
    "code": "4200-002",
    "name": "Initiation Fees",
    "type": "revenue",
    "category": "dues_revenue",
    "description": "One-time initiation fees from new members",
    "parentCode": "4200",
    "statcanCode": "REV-DUES-INIT",
    "isActive": true,
    "sortOrder": 1202
  },
  {
    "code": "4300",
    "name": "Grants and Donations",
    "type": "revenue",
    "category": "other_revenue",
    "description": "Government grants, donations, and gifts",
    "parentCode": "4000",
    "statcanCode": "REV-GRANTS",
    "isActive": true,
    "sortOrder": 1300
  },
  {
    "code": "4400",
    "name": "Investment Income",
    "type": "revenue",
    "category": "other_revenue",
    "description": "Interest, dividends, and investment returns",
    "parentCode": "4000",
    "statcanCode": "REV-INVEST",
    "isActive": true,
    "sortOrder": 1400
  },
  {
    "code": "5000",
    "name": "Operating Expenses",
    "type": "expense",
    "category": "administrative",
    "description": "All operating expense accounts",
    "parentCode": null,
    "statcanCode": null,
    "isActive": true,
    "sortOrder": 2000
  },
  {
    "code": "5100",
    "name": "Salaries and Wages",
    "type": "expense",
    "category": "salaries_wages",
    "description": "Staff salaries, wages, and related costs",
    "parentCode": "5000",
    "statcanCode": "EXP-SALARIES",
    "isActive": true,
    "sortOrder": 2100
  },
  {
    "code": "5100-001",
    "name": "Officer Salaries",
    "type": "expense",
    "category": "salaries_wages",
    "description": "Salaries for elected union officers",
    "parentCode": "5100",
    "statcanCode": "EXP-SAL-OFFICERS",
    "isActive": true,
    "sortOrder": 2101
  },
  {
    "code": "5100-002",
    "name": "Staff Salaries",
    "type": "expense",
    "category": "salaries_wages",
    "description": "Salaries for administrative and support staff",
    "parentCode": "5100",
    "statcanCode": "EXP-SAL-STAFF",
    "isActive": true,
    "sortOrder": 2102
  },
  {
    "code": "5100-003",
    "name": "Employee Benefits",
    "type": "expense",
    "category": "salaries_wages",
    "description": "Health insurance, pensions, and other benefits",
    "parentCode": "5100",
    "statcanCode": "EXP-SAL-BENEFITS",
    "isActive": true,
    "sortOrder": 2103
  },
  {
    "code": "5200",
    "name": "Legal and Professional Fees",
    "type": "expense",
    "category": "legal_professional",
    "description": "Legal counsel, arbitration, and professional services",
    "parentCode": "5000",
    "statcanCode": "EXP-LEGAL",
    "isActive": true,
    "sortOrder": 2200
  },
  {
    "code": "5200-001",
    "name": "Legal Counsel",
    "type": "expense",
    "category": "legal_professional",
    "description": "Legal representation and advice",
    "parentCode": "5200",
    "statcanCode": "EXP-LEGAL-COUNSEL",
    "isActive": true,
    "sortOrder": 2201
  },
  {
    "code": "5200-002",
    "name": "Arbitration Costs",
    "type": "expense",
    "category": "legal_professional",
    "description": "Grievance arbitration and mediation",
    "parentCode": "5200",
    "statcanCode": "EXP-LEGAL-ARB",
    "isActive": true,
    "sortOrder": 2202
  },
  {
    "code": "5200-003",
    "name": "Accounting and Audit",
    "type": "expense",
    "category": "legal_professional",
    "description": "Accounting services and annual audit",
    "parentCode": "5200",
    "statcanCode": "EXP-LEGAL-ACCT",
    "isActive": true,
    "sortOrder": 2203
  },
  {
    "code": "5300",
    "name": "Per-Capita Tax Expense",
    "type": "expense",
    "category": "administrative",
    "description": "Per-capita remittances to parent organizations",
    "parentCode": "5000",
    "statcanCode": "EXP-PER-CAPITA",
    "isActive": true,
    "sortOrder": 2300
  },
  {
    "code": "5400",
    "name": "Administrative Expenses",
    "type": "expense",
    "category": "administrative",
    "description": "Office supplies, utilities, rent, and general admin",
    "parentCode": "5000",
    "statcanCode": "EXP-ADMIN",
    "isActive": true,
    "sortOrder": 2400
  },
  {
    "code": "5500",
    "name": "Travel and Meetings",
    "type": "expense",
    "category": "administrative",
    "description": "Travel, accommodations, and meeting costs",
    "parentCode": "5000",
    "statcanCode": "EXP-TRAVEL",
    "isActive": true,
    "sortOrder": 2500
  },
  {
    "code": "6000",
    "name": "Special Expenses",
    "type": "expense",
    "category": "strike_fund",
    "description": "Strike fund, education, organizing, and special projects",
    "parentCode": null,
    "statcanCode": null,
    "isActive": true,
    "sortOrder": 3000
  },
  {
    "code": "6100",
    "name": "Strike Fund Disbursements",
    "type": "expense",
    "category": "strike_fund",
    "description": "Strike pay and related support costs",
    "parentCode": "6000",
    "statcanCode": "EXP-STRIKE",
    "isActive": true,
    "sortOrder": 3100
  },
  {
    "code": "6200",
    "name": "Education and Training",
    "type": "expense",
    "category": "education_training",
    "description": "Member education, steward training, conferences",
    "parentCode": "6000",
    "statcanCode": "EXP-EDUCATION",
    "isActive": true,
    "sortOrder": 3200
  },
  {
    "code": "6300",
    "name": "Organizing Campaigns",
    "type": "expense",
    "category": "organizing",
    "description": "New member organizing and recruitment",
    "parentCode": "6000",
    "statcanCode": "EXP-ORGANIZING",
    "isActive": true,
    "sortOrder": 3300
  },
  {
    "code": "6400",
    "name": "Political Action",
    "type": "expense",
    "category": "political_action",
    "description": "Political advocacy and lobbying activities",
    "parentCode": "6000",
    "statcanCode": "EXP-POLITICAL",
    "isActive": true,
    "sortOrder": 3400
  },
  {
    "code": "7000",
    "name": "Assets",
    "type": "asset",
    "category": "assets",
    "description": "Cash, investments, and capital assets",
    "parentCode": null,
    "statcanCode": null,
    "isActive": true,
    "sortOrder": 4000
  },
  {
    "code": "7100",
    "name": "Cash and Bank Accounts",
    "type": "asset",
    "category": "assets",
    "description": "Operating accounts and petty cash",
    "parentCode": "7000",
    "statcanCode": "ASSET-CASH",
    "isActive": true,
    "sortOrder": 4100
  },
  {
    "code": "7200",
    "name": "Investments",
    "type": "asset",
    "category": "assets",
    "description": "Securities, GICs, and investment funds",
    "parentCode": "7000",
    "statcanCode": "ASSET-INVEST",
    "isActive": true,
    "sortOrder": 4200
  },
  {
    "code": "7300",
    "name": "Capital Assets",
    "type": "asset",
    "category": "assets",
    "description": "Buildings, equipment, and vehicles",
    "parentCode": "7000",
    "statcanCode": "ASSET-CAPITAL",
    "isActive": true,
    "sortOrder": 4300
  }
];

export async function seedCLCAccounts() {
  console.log('Seeding CLC standard chart of accounts...');
  
  for (const account of CLC_ACCOUNTS) {
    await db.insert(chartOfAccounts).values({
      organizationId: null, // CLC accounts are global
      accountCode: account.code,
      accountName: account.name,
      description: account.description,
      accountType: account.type as any,
      accountCategory: account.category as any,
      parentAccountCode: account.parentCode || null,
      level: account.parentCode ? 1 : 0,
      sortOrder: account.sortOrder,
      isCLCStandard: true,
      statisticsCanadaCode: account.statcanCode || null,
      isActive: account.isActive !== false,
      isSystem: true,
    }).onConflictDoNothing();
  }
  
  console.log(`✅ Seeded ${CLC_ACCOUNTS.length} CLC accounts`);
}

// Run if called directly
if (require.main === module) {
  seedCLCAccounts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
