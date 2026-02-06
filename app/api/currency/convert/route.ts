import { NextRequest, NextResponse } from 'next/server';
import { currencyEnforcementService } from '@/services/currency-enforcement-service';

/**
 * FX Conversion API
 * Bank of Canada noon rate conversions
 */

// GET /api/currency/convert?amount=100&date=2026-02-06
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const amountStr = searchParams.get('amount');
    const dateStr = searchParams.get('date');

    if (!amountStr) {
      return NextResponse.json(
        { error: 'Amount parameter required' },
        { status: 400 }
      );
    }

    const amountUSD = parseFloat(amountStr);
    const date = dateStr ? new Date(dateStr) : new Date();

    // Convert USD to CAD using Bank of Canada noon rate
    const conversion = await currencyEnforcementService.convertUSDToCAD(amountUSD, date);

    return NextResponse.json({
      amountUSD,
      amountCAD: conversion.amountCAD,
      exchangeRate: conversion.exchangeRate,
      rateDate: conversion.rateDate,
      source: conversion.source,
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    return NextResponse.json(
      { error: 'Conversion failed' },
      { status: 500 }
    );
  }
}
