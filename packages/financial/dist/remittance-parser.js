/**
 * Remittance Parser
 * Handles parsing of employer remittance files in various formats
 * Supports: CSV, Excel (.xlsx), XML/EDI
 */
import * as XLSX from 'xlsx';
import { parse as parseCSV } from 'csv-parse/sync';
import { XMLParser } from 'fast-xml-parser';
/**
 * Main Remittance Parser Class
 */
export class RemittanceParser {
    constructor(config = {}) {
        this.config = {
            csvDelimiter: ',',
            csvHasHeader: true,
            csvSkipLines: 0,
            requireEmployeeId: true,
            ...config,
        };
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
        });
    }
    /**
     * Parse CSV file
     */
    async parseCSV(content) {
        const errors = [];
        const records = [];
        try {
            const csvString = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
            const rows = parseCSV(csvString, {
                delimiter: this.config.csvDelimiter,
                skip_empty_lines: true,
                from: (this.config.csvSkipLines || 0) + 1,
                columns: this.config.csvHasHeader,
                trim: true,
                relax_column_count: true,
            });
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const lineNumber = i + (this.config.csvSkipLines || 0) + (this.config.csvHasHeader ? 2 : 1);
                try {
                    const record = this.parseRow(row, lineNumber);
                    records.push(record);
                }
                catch (error) {
                    errors.push({
                        line: lineNumber,
                        message: error.message,
                        rawData: row,
                    });
                }
            }
        }
        catch (error) {
            errors.push({
                line: 0,
                message: `CSV parsing failed: ${error.message}`,
            });
        }
        return this.buildResult(records, errors);
    }
    /**
     * Parse Excel file (.xlsx)
     */
    async parseExcel(content) {
        const errors = [];
        const records = [];
        try {
            const workbook = XLSX.read(content, { type: 'buffer' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            // Convert to JSON
            const rows = XLSX.utils.sheet_to_json(worksheet, {
                header: this.config.csvHasHeader ? undefined : 1,
                defval: '',
                raw: false,
            });
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const lineNumber = i + 2; // Excel is 1-indexed, plus header row
                try {
                    const record = this.parseRow(row, lineNumber);
                    records.push(record);
                }
                catch (error) {
                    errors.push({
                        line: lineNumber,
                        message: error.message,
                        rawData: row,
                    });
                }
            }
        }
        catch (error) {
            errors.push({
                line: 0,
                message: `Excel parsing failed: ${error.message}`,
            });
        }
        return this.buildResult(records, errors);
    }
    /**
     * Parse XML/EDI file
     */
    async parseXML(content) {
        const errors = [];
        const records = [];
        try {
            const xmlString = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
            const parsed = this.xmlParser.parse(xmlString);
            // Support common XML structures
            let remittanceRecords = [];
            // Try common paths
            if (parsed.Remittance?.Employees?.Employee) {
                remittanceRecords = Array.isArray(parsed.Remittance.Employees.Employee)
                    ? parsed.Remittance.Employees.Employee
                    : [parsed.Remittance.Employees.Employee];
            }
            else if (parsed.remittance?.employees?.employee) {
                remittanceRecords = Array.isArray(parsed.remittance.employees.employee)
                    ? parsed.remittance.employees.employee
                    : [parsed.remittance.employees.employee];
            }
            else if (parsed.EmployerRemittance?.Records?.Record) {
                remittanceRecords = Array.isArray(parsed.EmployerRemittance.Records.Record)
                    ? parsed.EmployerRemittance.Records.Record
                    : [parsed.EmployerRemittance.Records.Record];
            }
            for (let i = 0; i < remittanceRecords.length; i++) {
                const xmlRecord = remittanceRecords[i];
                const lineNumber = i + 1;
                try {
                    const record = this.parseXMLRecord(xmlRecord, lineNumber);
                    records.push(record);
                }
                catch (error) {
                    errors.push({
                        line: lineNumber,
                        message: error.message,
                        rawData: xmlRecord,
                    });
                }
            }
        }
        catch (error) {
            errors.push({
                line: 0,
                message: `XML parsing failed: ${error.message}`,
            });
        }
        return this.buildResult(records, errors);
    }
    /**
     * Parse a single row (CSV or Excel)
     */
    parseRow(row, lineNumber) {
        const mapping = this.config.fieldMapping || this.getDefaultMapping();
        // Extract fields using mapping
        const employeeId = this.extractField(row, mapping.employeeId);
        const employeeName = mapping.employeeName ? this.extractField(row, mapping.employeeName) : undefined;
        const memberNumber = mapping.memberNumber ? this.extractField(row, mapping.memberNumber) : undefined;
        const grossWages = this.extractField(row, mapping.grossWages);
        const duesAmount = this.extractField(row, mapping.duesAmount);
        const periodStart = this.extractField(row, mapping.billingPeriodStart);
        const periodEnd = this.extractField(row, mapping.billingPeriodEnd);
        const hoursWorked = mapping.hoursWorked ? this.extractField(row, mapping.hoursWorked) : undefined;
        const overtimeHours = mapping.overtimeHours ? this.extractField(row, mapping.overtimeHours) : undefined;
        // Validate required fields
        if (this.config.requireEmployeeId && !employeeId) {
            throw new Error('Employee ID is required');
        }
        if (!grossWages || !duesAmount || !periodStart || !periodEnd) {
            throw new Error('Missing required fields: grossWages, duesAmount, billingPeriodStart, or billingPeriodEnd');
        }
        // Parse and validate amounts
        const parsedGrossWages = this.parseAmount(grossWages);
        const parsedDuesAmount = this.parseAmount(duesAmount);
        if (parsedGrossWages < 0 || parsedDuesAmount < 0) {
            throw new Error('Amounts cannot be negative');
        }
        if (this.config.minDuesAmount && parsedDuesAmount < this.config.minDuesAmount) {
            throw new Error(`Dues amount ${parsedDuesAmount} below minimum ${this.config.minDuesAmount}`);
        }
        if (this.config.maxDuesAmount && parsedDuesAmount > this.config.maxDuesAmount) {
            throw new Error(`Dues amount ${parsedDuesAmount} exceeds maximum ${this.config.maxDuesAmount}`);
        }
        // Parse dates
        const billingPeriodStart = this.parseDate(periodStart);
        const billingPeriodEnd = this.parseDate(periodEnd);
        if (billingPeriodEnd < billingPeriodStart) {
            throw new Error('Billing period end date must be after start date');
        }
        return {
            employeeId,
            employeeName,
            memberNumber,
            grossWages: parsedGrossWages,
            duesAmount: parsedDuesAmount,
            billingPeriodStart,
            billingPeriodEnd,
            hoursWorked: hoursWorked ? this.parseAmount(hoursWorked) : undefined,
            overtimeHours: overtimeHours ? this.parseAmount(overtimeHours) : undefined,
            rawLineNumber: lineNumber,
        };
    }
    /**
     * Parse XML record
     */
    parseXMLRecord(xmlRecord, lineNumber) {
        // Support both attribute and element-based XML
        const getValue = (key) => {
            return xmlRecord[key] || xmlRecord[`@_${key}`] || xmlRecord[key.toLowerCase()] || xmlRecord[`@_${key.toLowerCase()}`];
        };
        const employeeId = getValue('employeeId') || getValue('EmployeeID') || getValue('id');
        const employeeName = getValue('employeeName') || getValue('name');
        const memberNumber = getValue('memberNumber') || getValue('memberID');
        const grossWages = getValue('grossWages') || getValue('wages') || getValue('GrossWages');
        const duesAmount = getValue('duesAmount') || getValue('dues') || getValue('DuesAmount');
        const periodStart = getValue('periodStart') || getValue('billingPeriodStart');
        const periodEnd = getValue('periodEnd') || getValue('billingPeriodEnd');
        const hoursWorked = getValue('hoursWorked') || getValue('hours');
        const overtimeHours = getValue('overtimeHours') || getValue('overtime');
        if (this.config.requireEmployeeId && !employeeId) {
            throw new Error('Employee ID is required');
        }
        if (!grossWages || !duesAmount || !periodStart || !periodEnd) {
            throw new Error('Missing required XML fields');
        }
        return {
            employeeId,
            employeeName,
            memberNumber,
            grossWages: this.parseAmount(grossWages),
            duesAmount: this.parseAmount(duesAmount),
            billingPeriodStart: this.parseDate(periodStart),
            billingPeriodEnd: this.parseDate(periodEnd),
            hoursWorked: hoursWorked ? this.parseAmount(hoursWorked) : undefined,
            overtimeHours: overtimeHours ? this.parseAmount(overtimeHours) : undefined,
            rawLineNumber: lineNumber,
        };
    }
    /**
     * Extract field from row using string key or numeric index
     */
    extractField(row, fieldKey) {
        if (typeof fieldKey === 'number') {
            // Array-based row (headerless CSV)
            return row[fieldKey];
        }
        else {
            // Object-based row (CSV with headers or Excel)
            return row[fieldKey];
        }
    }
    /**
     * Parse amount (handles currency symbols, commas, etc.)
     */
    parseAmount(value) {
        if (typeof value === 'number') {
            return value;
        }
        // Remove currency symbols and commas
        const cleaned = String(value).replace(/[$,]/g, '').trim();
        const parsed = parseFloat(cleaned);
        if (isNaN(parsed)) {
            throw new Error(`Invalid amount: ${value}`);
        }
        return parsed;
    }
    /**
     * Parse date from various formats
     */
    parseDate(value) {
        if (value instanceof Date) {
            return value;
        }
        // Try parsing as ISO string or common formats
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            // Try parsing MM/DD/YYYY or DD/MM/YYYY
            const parts = String(value).split(/[-/]/);
            if (parts.length === 3) {
                // Assume MM/DD/YYYY
                const parsed = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            }
            throw new Error(`Invalid date: ${value}`);
        }
        return date;
    }
    /**
     * Get default field mapping
     */
    getDefaultMapping() {
        return {
            employeeId: 'employee_id',
            employeeName: 'employee_name',
            memberNumber: 'member_number',
            grossWages: 'gross_wages',
            duesAmount: 'dues_amount',
            billingPeriodStart: 'period_start',
            billingPeriodEnd: 'period_end',
            hoursWorked: 'hours_worked',
            overtimeHours: 'overtime_hours',
        };
    }
    /**
     * Build final result with summary
     */
    buildResult(records, errors) {
        const totalDuesAmount = records.reduce((sum, r) => sum + r.duesAmount, 0);
        const totalGrossWages = records.reduce((sum, r) => sum + r.grossWages, 0);
        return {
            success: errors.length === 0,
            records,
            errors,
            summary: {
                totalRecords: records.length + errors.length,
                validRecords: records.length,
                invalidRecords: errors.length,
                totalDuesAmount,
                totalGrossWages,
            },
        };
    }
}
export default RemittanceParser;
//# sourceMappingURL=remittance-parser.js.map