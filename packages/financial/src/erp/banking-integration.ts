/**
 * Banking Integration Service
 * 
 * Handles bank feed imports, statement reconciliation, and payment processing.
 * Supports CSV, OFX, QFX formats and direct API integrations (Plaid).
 */

import { Decimal } from 'decimal.js';
import { parse } from 'csv-parse/sync';
import { 
  BankTransaction, 
  ReconciliationMatch, 
  BankReconciliation, 
  ReconciliationAdjustment 
} from './types';

export interface BankFeedConfig {
  provider: 'plaid' | 'csv' | 'ofx' | 'qfx' | 'manual';
  credentials?: {
    clientId?: string;
    secret?: string;
    accessToken?: string;
  };
  bankAccountId: string;
  glAccountId: string;
  autoReconcile: boolean;
  reconciliationRules: ReconciliationRule[];
}

export interface ReconciliationRule {
  id: string;
  name: string;
  priority: number;
  conditions: ReconciliationCondition[];
  actions: ReconciliationAction[];
  isActive: boolean;
}

export interface ReconciliationCondition {
  field: 'description' | 'amount' | 'payee' | 'reference';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'greater_than' | 'less_than';
  value: string | number;
}

export interface ReconciliationAction {
  type: 'auto_match' | 'categorize' | 'create_journal_entry' | 'flag_for_review';
  glAccountId?: string;
  category?: string;
  confidence: number; // 0-100
}

export class BankingIntegrationService {
  private config: BankFeedConfig;

  constructor(config: BankFeedConfig) {
    this.config = config;
  }

  /**
   * Import bank transactions from CSV file
   */
  async importFromCSV(csvContent: string, format: 'generic' | 'td' | 'rbc' | 'scotiabank' | 'bmo'): Promise<BankTransaction[]> {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map((record: any, index: number) => {
      switch (format) {
        case 'td':
          return this.parseTDTransaction(record, index);
        case 'rbc':
          return this.parseRBCTransaction(record, index);
        case 'scotiabank':
          return this.parseScotiabankTransaction(record, index);
        case 'bmo':
          return this.parseBMOTransaction(record, index);
        default:
          return this.parseGenericTransaction(record, index);
      }
    });
  }

  /**
   * Import bank transactions from OFX file
   */
  async importFromOFX(ofxContent: string): Promise<BankTransaction[]> {
    // Parse OFX format (XML-like)
    const transactions: BankTransaction[] = [];
    
    // Simple regex-based parser for OFX
    const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;

    let index = 0;
    while ((match = transactionRegex.exec(ofxContent)) !== null) {
      const transactionXml = match[1];
      
      const getField = (field: string) => {
        const fieldMatch = new RegExp(`<${field}>([^<]+)`).exec(transactionXml);
        return fieldMatch ? fieldMatch[1] : '';
      };

      const type = getField('TRNTYPE');
      const amount = new Decimal(getField('TRNAMT'));
      
      transactions.push({
        id: `ofx-${index++}`,
        bankAccountId: this.config.bankAccountId,
        transactionDate: this.parseOFXDate(getField('DTPOSTED')),
        postingDate: this.parseOFXDate(getField('DTPOSTED')),
        description: getField('NAME') || getField('MEMO'),
        amount: amount.abs(),
        type: amount.isNegative() ? 'debit' : 'credit',
        balance: new Decimal(0), // OFX may not include running balance
        reference: getField('FITID'),
        payee: getField('NAME'),
        isReconciled: false,
      });
    }

    return transactions;
  }

  /**
   * Connect to Plaid for automated bank feeds
   */
  async connectPlaid(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    if (!this.config.credentials?.clientId || !this.config.credentials?.secret) {
      throw new Error('Plaid credentials not configured');
    }

    // Exchange public token for access token
    const response = await fetch('https://production.plaid.com/item/public_token/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.credentials.clientId,
        secret: this.config.credentials.secret,
        public_token: publicToken,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Plaid connection failed: ${data.error_message}`);
    }

    return {
      accessToken: data.access_token,
      itemId: data.item_id,
    };
  }

  /**
   * Get transactions from Plaid
   */
  async getPlaidTransactions(startDate: Date, endDate: Date): Promise<BankTransaction[]> {
    if (!this.config.credentials?.accessToken) {
      throw new Error('Plaid access token not available');
    }

    const response = await fetch('https://production.plaid.com/transactions/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.credentials.clientId,
        secret: this.config.credentials.secret,
        access_token: this.config.credentials.accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Plaid API error: ${data.error_message}`);
    }

    return data.transactions.map((txn: any, index: number) => ({
      id: txn.transaction_id,
      bankAccountId: this.config.bankAccountId,
      transactionDate: new Date(txn.date),
      postingDate: new Date(txn.date),
      description: txn.name,
      amount: new Decimal(Math.abs(txn.amount)),
      type: txn.amount > 0 ? 'debit' : 'credit',
      balance: new Decimal(0),
      reference: txn.transaction_id,
      payee: txn.merchant_name || txn.name,
      category: txn.category?.join(' - '),
      isReconciled: false,
      metadata: {
        pending: txn.pending,
        category_id: txn.category_id,
        location: txn.location,
      },
    }));
  }

  /**
   * Auto-reconcile transactions using rules
   */
  async autoReconcile(bankTransactions: BankTransaction[], glTransactions: any[]): Promise<ReconciliationMatch[]> {
    const matches: ReconciliationMatch[] = [];

    for (const bankTxn of bankTransactions) {
      // Try exact matching first
      const exactMatch = glTransactions.find(glTxn =>
        Math.abs(glTxn.amount - bankTxn.amount.toNumber()) < 0.01 &&
        Math.abs(new Date(glTxn.date).getTime() - bankTxn.transactionDate.getTime()) < 7 * 24 * 60 * 60 * 1000 // 7 days
      );

      if (exactMatch) {
        matches.push({
          erpTransactionId: bankTxn.id,
          unionEyesTransactionId: exactMatch.id,
          matchType: 'exact',
          matchScore: 100,
          matchedAt: new Date(),
          isConfirmed: true,
        });
        continue;
      }

      // Try fuzzy matching
      const fuzzyMatches = glTransactions
        .map(glTxn => ({
          transaction: glTxn,
          score: this.calculateMatchScore(bankTxn, glTxn),
        }))
        .filter(match => match.score > 70)
        .sort((a, b) => b.score - a.score);

      if (fuzzyMatches.length > 0) {
        const bestMatch = fuzzyMatches[0];
        matches.push({
          erpTransactionId: bankTxn.id,
          unionEyesTransactionId: bestMatch.transaction.id,
          matchType: 'fuzzy',
          matchScore: bestMatch.score,
          matchedAt: new Date(),
          isConfirmed: false, // Requires manual confirmation
        });
      }
    }

    return matches;
  }

  /**
   * Calculate match score between bank and GL transaction
   */
  private calculateMatchScore(bankTxn: BankTransaction, glTxn: any): number {
    let score = 0;

    // Amount match (50 points)
    const amountDiff = Math.abs(bankTxn.amount.toNumber() - glTxn.amount);
    if (amountDiff < 0.01) {
      score += 50;
    } else if (amountDiff < 1) {
      score += 40;
    } else if (amountDiff < 10) {
      score += 20;
    }

    // Date proximity (30 points)
    const daysDiff = Math.abs(bankTxn.transactionDate.getTime() - new Date(glTxn.date).getTime()) / (24 * 60 * 60 * 1000);
    if (daysDiff === 0) {
      score += 30;
    } else if (daysDiff <= 3) {
      score += 20;
    } else if (daysDiff <= 7) {
      score += 10;
    }

    // Description similarity (20 points)
    const descSimilarity = this.calculateStringSimilarity(
      bankTxn.description.toLowerCase(),
      glTxn.description?.toLowerCase() || ''
    );
    score += Math.floor(descSimilarity * 20);

    return score;
  }

  /**
   * Calculate string similarity (Levenshtein distance based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Handle NSF (Non-Sufficient Funds) / returned payment
   */
  async handleNSFPayment(params: {
    originalPaymentId: string;
    memberId: string;
    amount: Decimal;
    nsfDate: Date;
    bankCharge: Decimal;
  }): Promise<void> {
    // This would create reversing journal entries and apply fees
    // Implementation depends on GL integration
  }

  /**
   * Process EFT (Electronic Funds Transfer) batch
   */
  async processEFTBatch(payments: Array<{
    payeeAccountNumber: string;
    payeeName: string;
    amount: Decimal;
    reference: string;
  }>): Promise<string> {
    // Generate EFT file in CPA 005 format (Canadian standard)
    // Implementation would create properly formatted EFT file
    return 'EFT batch file content';
  }

  // ============================================================================
  // PRIVATE BANK-SPECIFIC PARSERS
  // ============================================================================

  private parseTDTransaction(record: any, index: number): BankTransaction {
    return {
      id: `td-${index}`,
      bankAccountId: this.config.bankAccountId,
      transactionDate: new Date(record['Date']),
      postingDate: new Date(record['Date']),
      description: record['Description'],
      amount: new Decimal(Math.abs(parseFloat(record['Amount']))),
      type: parseFloat(record['Amount']) < 0 ? 'debit' : 'credit',
      balance: new Decimal(record['Balance'] || 0),
      reference: record['Reference'],
      isReconciled: false,
    };
  }

  private parseRBCTransaction(record: any, index: number): BankTransaction {
    return {
      id: `rbc-${index}`,
      bankAccountId: this.config.bankAccountId,
      transactionDate: new Date(record['Transaction Date']),
      postingDate: new Date(record['Posting Date']),
      description: record['Description 1'] + ' ' + (record['Description 2'] || ''),
      amount: new Decimal(Math.abs(parseFloat(record['Amount']))),
      type: parseFloat(record['Amount']) < 0 ? 'debit' : 'credit',
      balance: new Decimal(0),
      isReconciled: false,
    };
  }

  private parseScotiabankTransaction(record: any, index: number): BankTransaction {
    return {
      id: `scotia-${index}`,
      bankAccountId: this.config.bankAccountId,
      transactionDate: new Date(record['Trans Date']),
      postingDate: new Date(record['Trans Date']),
      description: record['Transaction Details'],
      amount: new Decimal(Math.abs(parseFloat(record['Amount']))),
      type: parseFloat(record['Amount']) < 0 ? 'debit' : 'credit',
      balance: new Decimal(0),
      isReconciled: false,
    };
  }

  private parseBMOTransaction(record: any, index: number): BankTransaction {
    return {
      id: `bmo-${index}`,
      bankAccountId: this.config.bankAccountId,
      transactionDate: new Date(record['Posted Date']),
      postingDate: new Date(record['Posted Date']),
      description: record['Description'],
      amount: new Decimal(Math.abs(parseFloat(record['Amount']) || parseFloat(record['CAD$']))),
      type: parseFloat(record['Amount'] || record['CAD$']) < 0 ? 'debit' : 'credit',
      balance: new Decimal(0),
      isReconciled: false,
    };
  }

  private parseGenericTransaction(record: any, index: number): BankTransaction {
    // Try to auto-detect columns
    const dateKey = Object.keys(record).find(k => k.toLowerCase().includes('date'));
    const descKey = Object.keys(record).find(k => k.toLowerCase().includes('desc'));
    const amountKey = Object.keys(record).find(k => k.toLowerCase().includes('amount'));

    return {
      id: `generic-${index}`,
      bankAccountId: this.config.bankAccountId,
      transactionDate: dateKey ? new Date(record[dateKey]) : new Date(),
      postingDate: dateKey ? new Date(record[dateKey]) : new Date(),
      description: descKey ? record[descKey] : '',
      amount: amountKey ? new Decimal(Math.abs(parseFloat(record[amountKey]))) : new Decimal(0),
      type: amountKey && parseFloat(record[amountKey]) < 0 ? 'debit' : 'credit',
      balance: new Decimal(0),
      isReconciled: false,
    };
  }

  private parseOFXDate(dateStr: string): Date {
    // OFX date format: YYYYMMDDHHMMSS.XXX
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  }
}
