import { NextRequest, NextResponse } from 'next/server';
import { carbonAccountingIntegration } from '@/services/carbon-accounting-integration';

/**
 * Carbon Accounting API
 * Monitor Azure infrastructure carbon emissions
 */

// GET /api/carbon/dashboard
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subscriptionId = searchParams.get('subscriptionId') || process.env.AZURE_SUBSCRIPTION_ID;
    const resourceGroupName = searchParams.get('resourceGroupName') || process.env.AZURE_RESOURCE_GROUP;

    if (!subscriptionId || !resourceGroupName) {
      return NextResponse.json(
        { error: 'Missing Azure subscription ID or resource group name' },
        { status: 400 }
      );
    }

    const dashboard = await carbonAccountingIntegration.getCarbonDashboard({
      subscriptionId,
      resourceGroupName,
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Carbon dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to get carbon dashboard' },
      { status: 500 }
    );
  }
}
