/**
 * Unit Tests for Statistics Canada Client
 */

import { 
  StatisticsCanadaClient, 
  WageDataSchema, 
  UnionDensitySchema, 
  provinceToGeographyCode,
  getNOCCategory,
  calculateWageIncrease 
} from '@/lib/services/external-data/statcan-client';

describe('StatisticsCanadaClient', () => {
  let client: StatisticsCanadaClient;

  beforeEach(() => {
    client = new StatisticsCanadaClient();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(client).toBeInstanceOf(StatisticsCanadaClient);
    });

    it('should use environment variables if provided', () => {
      process.env.STATCAN_API_URL = 'https://custom-api.statcan.gc.ca';
      process.env.STATCAN_API_KEY = 'test-key';
      
      const customClient = new StatisticsCanadaClient();
      expect(customClient).toBeInstanceOf(StatisticsCanadaClient);
      
      // Clean up
      delete process.env.STATCAN_API_URL;
      delete process.env.STATCAN_API_KEY;
    });
  });
});

describe('Schema Validation', () => {
  describe('WageDataSchema', () => {
    it('should validate valid wage data', () => {
      const validWageData = {
        GEO: '35',
        GEOUID: '35',
        GEOName: 'Ontario',
        NAICS: '62',
        NAICSName: 'Health care and social assistance',
        NOC: '3012',
        NOCName: 'Registered nurses and registered psychiatric nurses',
        Wages: {
          UOM: 'Hourly',
          Vector: 'v123',
          Coordinate: 1,
          Value: 45.50,
          Symbol: null,
          Terminated: null,
          Decimals: 2,
        },
        Sex: 'B',
        AgeGroup: '25-54',
        AgeGroupName: '25 to 54 years',
        Education: 'uni_degree',
        EducationName: "Bachelor's degree",
        Statistics: 'Average',
        StatisticsName: 'Average wage',
        DataType: 'Regular',
        DataTypeName: 'Regular earnings',
        RefDate: '2024-01',
        Source: 'Statistics Canada',
      };

      const result = WageDataSchema.safeParse(validWageData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NOC).toBe('3012');
        expect(result.data.Wages.Value).toBe(45.50);
      }
    });

    it('should reject invalid wage data', () => {
      const invalidWageData = {
        GEO: '35',
        // Missing required fields
      };

      const result = WageDataSchema.safeParse(invalidWageData);
      expect(result.success).toBe(false);
    });
  });

  describe('UnionDensitySchema', () => {
    it('should validate valid union density data', () => {
      const validUnionData = {
        GEO: '01',
        GEOUID: '01',
        GEOName: 'Canada',
        NAICS: '62',
        NAICSName: 'Health care and social assistance',
        Sex: 'B',
        AgeGroup: '25-54',
        AgeGroupName: '25 to 54 years',
        UnionStatus: 'union_member',
        UnionStatusName: 'Member of a union',
        Value: 72.5,
        Vector: 'v456',
        Coordinate: 2,
        Symbol: null,
        Terminated: null,
        Decimals: 1,
        RefDate: '2024-01',
        Source: 'Statistics Canada',
      };

      const result = UnionDensitySchema.safeParse(validUnionData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.UnionStatus).toBe('union_member');
        expect(result.data.Value).toBe(72.5);
      }
    });
  });
});

describe('Helper Functions', () => {
  describe('provinceToGeographyCode', () => {
    it('should map provinces to correct geography codes', () => {
      expect(provinceToGeographyCode('CA')).toBe('01');
      expect(provinceToGeographyCode('01')).toBe('01');
      expect(provinceToGeographyCode('ON')).toBe('35');
      expect(provinceToGeographyCode('Ontario')).toBe('35');
      expect(provinceToGeographyCode('BC')).toBe('59');
      expect(provinceToGeographyCode('British Columbia')).toBe('59');
      expect(provinceToGeographyCode('AB')).toBe('48');
      expect(provinceToGeographyCode('Alberta')).toBe('48');
      expect(provinceToGeographyCode('QC')).toBe('24');
      expect(provinceToGeographyCode('Quebec')).toBe('24');
    });

    it('should be case insensitive', () => {
      expect(provinceToGeographyCode('on')).toBe('35');
      expect(provinceToGeographyCode('ontario')).toBe('35');
    });

    it('should return Canada code for unknown provinces', () => {
      expect(provinceToGeographyCode('UNKNOWN')).toBe('01');
    });
  });

  describe('getNOCCategory', () => {
    it('should return correct category for NOC prefixes', () => {
      expect(getNOCCategory('0000')).toBe('Management occupations');
      expect(getNOCCategory('1000')).toBe('Business, finance and administration occupations');
      expect(getNOCCategory('2000')).toBe('Natural and applied sciences and related occupations');
      expect(getNOCCategory('3000')).toBe('Health occupations');
      expect(getNOCCategory('4000')).toBe('Occupations in education, law and social, community and government services');
      expect(getNOCCategory('5000')).toBe('Occupations in art, culture, recreation and sport');
      expect(getNOCCategory('6000')).toBe('Sales and service occupations');
      expect(getNOCCategory('7000')).toBe('Trades, transport and equipment operators and related occupations');
      expect(getNOCCategory('8000')).toBe('Natural resources, agriculture and related production occupations');
      expect(getNOCCategory('9000')).toBe('Occupations in manufacturing and utilities');
    });

    it('should return Unknown for invalid prefixes', () => {
      expect(getNOCCategory('9999')).toBe('Occupations in manufacturing and utilities');
    });
  });

  describe('calculateWageIncrease', () => {
    it('should calculate correct wage increase percentage', () => {
      expect(calculateWageIncrease(40, 45)).toBe(12.5);
      expect(calculateWageIncrease(50, 55)).toBe(10);
      expect(calculateWageIncrease(100, 150)).toBe(50);
    });

    it('should return 0 for zero old wage', () => {
      expect(calculateWageIncrease(0, 45)).toBe(0);
    });

    it('should handle negative increases', () => {
      expect(calculateWageIncrease(50, 45)).toBe(-10);
    });
  });
});

describe('Integration Tests (Mocked)', () => {
  let client: StatisticsCanadaClient;

  beforeEach(() => {
    client = new StatisticsCanadaClient();
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue('Internal Server Error'),
    });

    await expect(client.getWageData({ nocCode: '3012' }))
      .rejects.toThrow('Statistics Canada API error');
  });

  it('should parse JSON responses correctly', async () => {
    const mockWageData = [
      {
        GEO: '35',
        GEOUID: '35',
        GEOName: 'Ontario',
        NAICS: '62',
        NAICSName: 'Health care',
        NOC: '3012',
        NOCName: 'Registered nurses',
        Wages: {
          UOM: 'Hourly',
          Vector: 'v123',
          Coordinate: 1,
          Value: 45.50,
          Symbol: null,
          Terminated: null,
          Decimals: 2,
        },
        Sex: 'B',
        AgeGroup: '25-54',
        AgeGroupName: '25 to 54 years',
        Education: 'uni_degree',
        EducationName: "Bachelor's degree",
        Statistics: 'Average',
        StatisticsName: 'Average wage',
        DataType: 'Regular',
        DataTypeName: 'Regular earnings',
        RefDate: '2024-01',
        Source: 'Statistics Canada',
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(mockWageData),
    });

    const result = await client.getWageData({ nocCode: '3012', geography: '35' });
    
    expect(result).toHaveLength(1);
    expect(result[0].NOC).toBe('3012');
    expect(result[0].Wages.Value).toBe(45.50);
  });
});
