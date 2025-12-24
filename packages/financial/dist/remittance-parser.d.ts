/**
 * Remittance Parser
 * Handles parsing of employer remittance files in various formats
 * Supports: CSV, Excel (.xlsx), XML/EDI
 */
export interface RemittanceRecord {
    employeeId: string;
    employeeName?: string;
    memberNumber?: string;
    grossWages: number;
    duesAmount: number;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    hoursWorked?: number;
    overtimeHours?: number;
    metadata?: Record<string, any>;
    rawLineNumber?: number;
}
export interface ParseResult {
    success: boolean;
    records: RemittanceRecord[];
    errors: ParseError[];
    summary: {
        totalRecords: number;
        validRecords: number;
        invalidRecords: number;
        totalDuesAmount: number;
        totalGrossWages: number;
    };
}
export interface ParseError {
    line: number;
    field?: string;
    message: string;
    rawData?: any;
}
export interface ParserConfig {
    csvDelimiter?: string;
    csvHasHeader?: boolean;
    csvSkipLines?: number;
    fieldMapping?: {
        employeeId: string | number;
        employeeName?: string | number;
        memberNumber?: string | number;
        grossWages: string | number;
        duesAmount: string | number;
        billingPeriodStart: string | number;
        billingPeriodEnd: string | number;
        hoursWorked?: string | number;
        overtimeHours?: string | number;
    };
    dateFormat?: string;
    minDuesAmount?: number;
    maxDuesAmount?: number;
    requireEmployeeId?: boolean;
}
/**
 * Main Remittance Parser Class
 */
export declare class RemittanceParser {
    private config;
    private xmlParser;
    constructor(config?: ParserConfig);
    /**
     * Parse CSV file
     */
    parseCSV(content: string | Buffer): Promise<ParseResult>;
    /**
     * Parse Excel file (.xlsx)
     */
    parseExcel(content: Buffer): Promise<ParseResult>;
    /**
     * Parse XML/EDI file
     */
    parseXML(content: string | Buffer): Promise<ParseResult>;
    /**
     * Parse a single row (CSV or Excel)
     */
    private parseRow;
    /**
     * Parse XML record
     */
    private parseXMLRecord;
    /**
     * Extract field from row using string key or numeric index
     */
    private extractField;
    /**
     * Parse amount (handles currency symbols, commas, etc.)
     */
    private parseAmount;
    /**
     * Parse date from various formats
     */
    private parseDate;
    /**
     * Get default field mapping
     */
    private getDefaultMapping;
    /**
     * Build final result with summary
     */
    private buildResult;
}
export default RemittanceParser;
//# sourceMappingURL=remittance-parser.d.ts.map