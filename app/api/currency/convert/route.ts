import { NextRequest, NextResponse } from 'next/server';
import { convertUSDToCAD, getExchangeRateHistory } from '@/lib/services/transfer-pricing-service';
import type { CurrencyConversionResponse } from '@/lib/types/compliance-api-types';

/**
 * FX Conversion API
 * Bank of Canada noon rate conversions
 * https://www.bankofcanada.ca/valet/observations/group/FX_DAILY
 */

/**
 * GET /api/currency/convert?amount=100&conversionDate=2026-02-06
 * Get current or historical USD to CAD conversion rates
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const amountStr = searchParams.get('amount');
    const dateStr = searchParams.get('conversionDate');

    if (!amountStr) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Amount parameter required (e.g., ?amount=100)',
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

    const amountUSD = parseFloat(amountStr);
    const date = dateStr ? new Date(dateStr) : undefined;

    if (isNaN(amountUSD) || amountUSD <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amount must be a positive number',
          sourceCurrency: 'USD',
          targetCurrency: 'CAD',
          sourceAmount: amountUSD,
          convertedAmount: 0,
          exchangeRate: 0,
          conversionDate: new Date().toISOString(),
          source: 'BOC',
        } as CurrencyConversionResponse,
        { status: 400 }
      );
    }

    // Convert USD to CAD
    const amountCAD = await convertUSDToCAD(amountUSD, date);

    // Get rate history for context
    const rateHistory = await getExchangeRateHistory(1);
    const latestRate = rateHistory[0]?.rate || (amountCAD / amountUSD);

    return NextResponse.json({
      success: true,
      sourceCurrency: 'USD',
      targetCurrency: 'CAD',
      sourceAmount: amountUSD,
      convertedAmount: parseFloat(amountCAD.toFixed(2)),
      exchangeRate: parseFloat(latestRate.toFixed(4)),
      conversionDate: date?.toISOString() || new Date().toISOString(),
      source: 'BOC VALET API',
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
        error: `Conversion failed: ${error}`,
      } as CurrencyConversionResponse,
      { status: 500 }
    );
  }
}
