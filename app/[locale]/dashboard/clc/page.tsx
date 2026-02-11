import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  FileText,
  Calendar,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import { db } from '@/db';
import { getUserRoleInOrganization } from '@/lib/organization-utils';
import CLCAnalyticsDashboard from '@/components/admin/clc-analytics-dashboard';
import { ClcRemittancesDashboard } from '@/components/admin/clc-remittances-dashboard';

export const metadata: Metadata = {
  title: 'CLC Executive Dashboard | Union Eyes',
  description: 'Canadian Labour Congress executive dashboard and national analytics',
};

async function checkCLCAccess(userId: string, orgId: string): Promise<boolean> {
  try {
    const userRole = await getUserRoleInOrganization(userId, orgId);
    // Allow clc_executive, clc_staff, and system_admin roles
    return ['clc_executive', 'clc_staff', 'system_admin'].includes(userRole || '');
  } catch (error) {
    return false;
  }
}

async function getCLCMetrics(orgId: string) {
  try {
    // Fetch direct-chartered unions and provincial federations
    const affiliates = await db.query.organizations.findMany({
      where: (organizations, { eq }) => eq(organizations.parentOrganizationId, orgId),
    });

    // Filter by type
    const directCharteredUnions = affiliates.filter(a => a.organizationType === 'union');
    const provincialFederations = affiliates.filter(a => a.organizationType === 'federation');

    // TODO: Replace with actual queries to per_capita_remittances table
    const totalAffiliates = affiliates.length;
    const totalMembers = 0; // TODO: Aggregate from affiliates
    const pendingRemittances = 0; // TODO: Query per_capita_remittances
    const overdueRemittances = 0; // TODO: Query overdue remittances
    const complianceRate = 0; // TODO: Calculate compliance percentage
    const totalRevenue = 0; // TODO: Sum approved remittances

    return {
      totalAffiliates,
      directCharteredUnions: directCharteredUnions.length,
      provincialFederations: provincialFederations.length,
      totalMembers,
      pendingRemittances,
      overdueRemittances,
      complianceRate,
      totalRevenue,
      affiliates,
    };
  } catch (error) {
    console.error('Error fetching CLC metrics:', error);
    return {
      totalAffiliates: 0,
      directCharteredUnions: 0,
      provincialFederations: 0,
      totalMembers: 0,
      pendingRemittances: 0,
      overdueRemittances: 0,
      complianceRate: 0,
      totalRevenue: 0,
      affiliates: [],
    };
  }
}

export default async function CLCDashboardPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect('/sign-in');
  }

  const hasAccess = await checkCLCAccess(userId, orgId);
  if (!hasAccess) {
    redirect('/dashboard');
  }

  const t = await getTranslations('clc');
  const metrics = await getCLCMetrics(orgId);

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8 text-red-600" />
            {t('dashboard.title', { defaultValue: 'CLC Executive Dashboard' })}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.description', { 
              defaultValue: 'Canadian Labour Congress national oversight, affiliate coordination, and per-capita remittance management' 
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/clc/compliance">
              <FileText className="mr-2 h-4 w-4" />
              {t('dashboard.compliance', { defaultValue: 'Compliance' })}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/clc/affiliates">
              <Users className="mr-2 h-4 w-4" />
              {t('dashboard.manageAffiliates', { defaultValue: 'Manage Affiliates' })}
            </Link>
          </Button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('metrics.totalAffiliates', { defaultValue: 'Total Affiliates' })}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAffiliates}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.directCharteredUnions} direct-chartered unions, {metrics.provincialFederations} federations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('metrics.totalMembers', { defaultValue: 'Total Members' })}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMembers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {t('metrics.acrossAllAffiliates', { defaultValue: 'Across all affiliates' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('metrics.pendingRemittances', { defaultValue: 'Pending Remittances' })}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingRemittances}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.overdueRemittances > 0 && (
                <span className="text-orange-600 font-medium">
                  {metrics.overdueRemittances} overdue
                </span>
              )}
              {metrics.overdueRemittances === 0 && (
                <span className="text-green-600">All up to date</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('metrics.complianceRate', { defaultValue: 'Compliance Rate' })}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.complianceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {t('metrics.thirtyDayAverage', { defaultValue: '30-day average' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('quickActions.title', { defaultValue: 'Quick Actions' })}
          </CardTitle>
          <CardDescription>
            {t('quickActions.description', { defaultValue: 'Common executive tasks and oversight functions' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button variant="outline" className="h-auto p-4 flex-col items-start" asChild>
              <Link href="/dashboard/clc/staff">
                <Calendar className="h-5 w-5 mb-2" />
                <div className="font-semibold">{t('actions.staffDashboard', { defaultValue: 'CLC Staff Dashboard' })}</div>
                <div className="text-xs text-muted-foreground">{t('actions.staffDesc', { defaultValue: 'National operations and sync' })}</div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex-col items-start" asChild>
              <Link href="/api/admin/clc/remittances">
                <DollarSign className="h-5 w-5 mb-2" />
                <div className="font-semibold">{t('actions.reviewRemittances', { defaultValue: 'Review Remittances' })}</div>
                <div className="text-xs text-muted-foreground">{t('actions.remittancesDesc', { defaultValue: 'Approve pending payments' })}</div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex-col items-start" asChild>
              <Link href="/dashboard/clc/affiliates">
                <Users className="h-5 w-5 mb-2" />
                <div className="font-semibold">{t('actions.manageAffiliates', { defaultValue: 'Manage Affiliates' })}</div>
                <div className="text-xs text-muted-foreground">{t('actions.affiliatesDesc', { defaultValue: 'View unions and federations' })}</div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex-col items-start" asChild>
              <Link href="/dashboard/clc/compliance">
                <FileText className="h-5 w-5 mb-2" />
                <div className="font-semibold">{t('actions.compliance', { defaultValue: 'Compliance Reports' })}</div>
                <div className="text-xs text-muted-foreground">{t('actions.complianceDesc', { defaultValue: 'National tracking' })}</div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex-col items-start" asChild>
              <Link href="/dashboard/admin/clc-analytics">
                <BarChart3 className="h-5 w-5 mb-2" />
                <div className="font-semibold">{t('actions.analytics', { defaultValue: 'CLC Analytics' })}</div>
                <div className="text-xs text-muted-foreground">{t('actions.analyticsDesc', { defaultValue: 'Trends and forecasts' })}</div>
              </Link>
            </Button>

            <Button variant="outline" className="h-auto p-4 flex-col items-start" asChild>
              <Link href="/dashboard/cross-union-analytics">
                <MapPin className="h-5 w-5 mb-2" />
                <div className="font-semibold">{t('actions.crossUnion', { defaultValue: 'Cross-Union Analytics' })}</div>
                <div className="text-xs text-muted-foreground">{t('actions.crossUnionDesc', { defaultValue: 'National comparisons' })}</div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CLC Analytics Dashboard */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            {t('analytics.title', { defaultValue: 'National Analytics' })}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('analytics.description', { defaultValue: 'Multi-year trends, organization comparisons, and forecasting' })}
          </p>
        </div>
        <CLCAnalyticsDashboard />
      </div>

      {/* Recent Remittances Overview */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            {t('remittances.title', { defaultValue: 'Per-Capita Remittances' })}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('remittances.description', { defaultValue: 'Recent submissions and approval workflows' })}
          </p>
        </div>
        <ClcRemittancesDashboard />
      </div>

      {/* Provincial Federation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('federations.title', { defaultValue: 'Provincial Federation Status' })}
          </CardTitle>
          <CardDescription>
            {t('federations.description', { defaultValue: 'Overview of provincial/territorial federations' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.provincialFederations === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('federations.noData', { defaultValue: 'No provincial federations configured' })}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.affiliates
                .filter(a => a.organizationType === 'federation')
                .map((federation) => (
                  <div key={federation.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{federation.name}</div>
                        <div className="text-sm text-muted-foreground">{federation.province || 'N/A'}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/federation?id=${federation.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
