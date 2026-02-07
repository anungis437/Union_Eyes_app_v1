import { NextRequest, NextResponse } from 'next/server';
import { convertUSDToCAD, getBankOfCanadaNoonRate } from '@/lib/services/transfer-pricing-service';
import type { CurrencyConversionResponse } from '@/lib/types/compliance-api-types';
import { withEnhancedRoleAuth } from '@/lib/enterprise-role-middleware';
import { z } from 'zod';

/**
 * FX Conversion API
 * Bank of Canada noon rate conversions
 * https://www.bankofcanada.ca/valet/observations/group/FX_DAILY
 */

/**
 * GET /api/currency/convert?amount=100&conversionDate=2026-02-06
 * Get current or historical USD to CAD conversion rates
 */
const convertQuerySchema = z.object({
  amount: z.coerce.number().positive(),
  conversionDate: z.string().optional(),
});

export const GET = withEnhancedRoleAuth(10, async (request) => {
  try {
    const query = convertQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    if (!query.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          sourceCurrency: 'USD',
          targetCurrency: 'CAD',
          sourceAmount: 0,
          convertedAmount: 0,
          exchangeRate: 0,
          conversionDate: new Date().toISOString(),
          source: 'BOC',
        } as CurrencyConversionResponse,
        { status: 400 }
      );
    }

    const { amount, conversionDate } = query.data;
    const date = conversionDate ? new Date(conversionDate) : new Date();

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid conversion date',
          sourceCurrency: 'USD',
          targetCurrency: 'CAD',
          sourceAmount: amount,
          convertedAmount: 0,
          exchangeRate: 0,
          conversionDate: new Date().toISOString(),
          source: 'BOC',
        } as CurrencyConversionResponse,
        { status: 400 }
      );
    }

    const amountCAD = await convertUSDToCAD(amount, date);
    const latestRate = await getBankOfCanadaNoonRate(date);

    return NextResponse.json({
      success: true,
      sourceCurrency: 'USD',
      targetCurrency: 'CAD',
      sourceAmount: amount,
      convertedAmount: parseFloat(amountCAD.toFixed(2)),
      exchangeRate: parseFloat(latestRate.toFixed(4)),
      conversionDate: date.toISOString(),
      source: 'BoC VALET API',
    } as CurrencyConversionResponse);
  } catch (error) {
    console.error('Currency conversion error:', error);
    return NextResponse.json(
      {
        success: false,
        sourceCurrency: 'USD',
        targetCurrency: 'CAD',
        sourceAmount: 0,
        convertedAmount: 0,
        exchangeRate: 0,
        conversionDate: new Date().toISOString(),
        source: 'BOC',
        error: 'Conversion failed',
      } as CurrencyConversionResponse,
      { status: 500 }
    );
  }
});
