import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { getBalance, listLedger } from '@/lib/services/rewards/wallet-service';
import { getTotalEarned, getTotalRedeemed } from '@/lib/utils/rewards-stats-utils';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Gift, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';
import { WalletBalanceCard } from '@/components/rewards/wallet-balance-card';
import { LedgerTable } from '@/components/rewards/ledger-table';

export const metadata: Metadata = {
  title: 'My Wallet | Recognition & Rewards',
  description: 'View your reward credits balance and transaction history',
};

export default async function RewardsWalletPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect('/sign-in');
  }

  const t = await getTranslations('rewards');

  // Fetch wallet data
  const balance = await getBalance(db, userId, orgId);
  const ledgerEntries = await listLedger(db, userId, orgId, {
    limit: 20,
    offset: 0,
  });
  
  // Calculate totals from ledger
  const totalEarned = await getTotalEarned(userId, orgId);
  const totalRedeemed = await getTotalRedeemed(userId, orgId);

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('wallet.title', { defaultValue: 'My Reward Wallet' })}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('wallet.description', { 
              defaultValue: 'View your reward credits and redeem them for products and services' 
            })}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/rewards/redeem">
            <Gift className="mr-2 h-5 w-5" />
            {t('wallet.redeemButton', { defaultValue: 'Redeem Credits' })}
          </Link>
        </Button>
      </div>

      {/* Balance Card */}
      <WalletBalanceCard balance={balance} />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('wallet.stats.totalEarned', { defaultValue: 'Total Earned' })}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalEarned.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('wallet.stats.allTime', { defaultValue: 'All time' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('wallet.stats.totalRedeemed', { defaultValue: 'Total Redeemed' })}
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRedeemed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('wallet.stats.allTime', { defaultValue: 'All time' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('wallet.stats.lastActivity', { defaultValue: 'Last Activity' })}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ledgerEntries.length > 0 
                ? new Date(ledgerEntries[0].created_at).toLocaleDateString()
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('wallet.stats.mostRecent', { defaultValue: 'Most recent transaction' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('wallet.ledger.title', { defaultValue: 'Transaction History' })}
          </CardTitle>
          <CardDescription>
            {t('wallet.ledger.description', { 
              defaultValue: 'Complete record of all credit transactions' 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LedgerTable entries={ledgerEntries} />
        </CardContent>
      </Card>
    </div>
  );
}
