/**
 * FreshBooks Integration Adapter
 * 
 * Cloud accounting for small businesses and freelancers.
 * 
 * Features:
 * - OAuth2 authentication
 * - Full and incremental sync
 * - Invoice, client (customer), payment, expense entities
 * 
 * @see https://www.freshbooks.com/api/start
 */

import { BaseIntegration } from '../../base-integration';
import {
  IntegrationType,
  IntegrationProvider,
  SyncOptions,
  SyncResult,
  HealthCheckResult,
  WebhookEvent,
  SyncType,
} from '../../types';
import { FreshBooksClient, type FreshBooksConfig } from './freshbooks-client';
import { db } from '@/db';
import { externalInvoices, externalPayments, externalCustomers, externalAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// ============================================================================
// FreshBooks Adapter
// ============================================================================

export class FreshBooksAdapter extends BaseIntegration {
  private client?: FreshBooksClient;
  private readonly PER_PAGE = 100;

  constructor() {
    super(IntegrationType.ACCOUNTING, IntegrationProvider.FRESHBOOKS, {
      supportsFullSync: true,
      supportsIncrementalSync: true,
      supportsWebhooks: true,
      supportsRealTime: false,
      supportedEntities: ['invoices', 'payments', 'clients', 'expenses'],
      requiresOAuth: true,
      rateLimitPerMinute: 100,
    });
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  async connect(): Promise<void> {
    this.ensureInitialized();

    try {
      const fbConfig: FreshBooksConfig = {
        clientId: this.config!.credentials.clientId!,
        clientSecret: this.config!.credentials.clientSecret!,
        accountId: this.config!.settings?.accountId || '',
        refreshToken: this.config!.credentials.refreshToken,
        environment: this.config!.settings?.environment || 'production',
      };

      this.client = new FreshBooksClient(fbConfig);
      await this.client.authenticate();
      
      const newRefreshToken = this.client.getRefreshToken();
      if (newRefreshToken && this.config) {
        this.config.credentials.refreshToken = newRefreshToken;
      }
      
      this.connected = true;
      this.logOperation('connect', 'Connected to FreshBooks');
    } catch (error) {
      this.logError('connect', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.client = undefined;
    this.logOperation('disconnect', 'Disconnected from FreshBooks');
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      this.ensureConnected();

      const startTime = Date.now();
      const isHealthy = await this.client!.healthCheck();
      const latency = Date.now() - startTime;

      return {
        healthy: isHealthy,
        latency,
        details: {
          provider: 'FreshBooks',
          connected: this.connected,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          provider: 'FreshBooks',
          connected: false,
        },
      };
    }
  }

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  async sync(options: SyncOptions): Promise<SyncResult> {
    this.ensureConnected();

    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      const entities = options.entities || this.capabilities.supportedEntities;

      for (const entity of entities) {
        try {
          this.logOperation('sync', `Syncing ${entity}`);

          switch (entity) {
            case 'invoices':
              const invResult = await this.syncInvoices(options.type, options.cursor);
              recordsProcessed += invResult.processed;
              recordsCreated += invResult.created;
              recordsUpdated += invResult.updated;
              recordsFailed += invResult.failed;
              break;

            case 'payments':
              const payResult = await this.syncPayments();
              recordsProcessed += payResult.processed;
              recordsCreated += payResult.created;
              recordsUpdated += payResult.updated;
              recordsFailed += payResult.failed;
              break;

            case 'clients':
              const clientResult = await this.syncClients();
              recordsProcessed += clientResult.processed;
              recordsCreated += clientResult.created;
              recordsUpdated += clientResult.updated;
              recordsFailed += clientResult.failed;
              break;

            case 'expenses':
              const expResult = await this.syncExpenses();
              recordsProcessed += expResult.processed;
              recordsCreated += expResult.created;
              recordsUpdated += expResult.updated;
              recordsFailed += expResult.failed;
              break;

            default:
              this.logOperation('sync', `Unknown entity: ${entity}`);
          }
        } catch (error) {
          const errorMsg = `Failed to sync ${entity}: ${error instanceof Error ? error.message : 'Unknown'}`;
          errors.push(errorMsg);
          this.logError('sync', error, { entity });
        }
      }

      const duration = Date.now() - startTime;

      return {
        success: recordsFailed === 0,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        duration,
        cursor: undefined,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError('sync', error);

      return {
        success: false,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================================================
  // Entity Sync Methods
  // ==========================================================================

  private async syncInvoices(
    syncType: SyncType,
    cursor?: string
  ): Promise<{ processed: number; created: number; updated: number; failed: number }> {
    let processed = 0;
    let created = 0;
    let updated = 0;
    let failed = 0;
    let page = 1;
    let hasMore = true;

    const updatedSince = syncType === SyncType.INCREMENTAL && cursor 
      ? new Date(cursor) 
      : undefined;

    while (hasMore) {
      const response = await this.client!.getInvoices({
        page,
        perPage: this.PER_PAGE,
        updatedSince,
      });

      for (const invoice of response.invoices) {
        try {
          const existing = await db.query.externalInvoices.findFirst({
            where: and(
              eq(externalInvoices.externalId, invoice.id.toString()),
              eq(externalInvoices.organizationId, this.config!.organizationId),
              eq(externalInvoices.externalProvider, 'FRESHBOOKS')
            ),
          });

          // Map status: 1=draft, 2=sent, 3=viewed, 4=paid, 5=auto-paid
          const statusMap: Record<number, string> = {
            1: 'draft',
            2: 'sent',
            3: 'viewed',
            4: 'paid',
            5: 'paid',
          };

          const invoiceData = {
            invoiceNumber: invoice.invoice_number,
            customerId: invoice.customerid.toString(),
            customerName: invoice.organization,
            invoiceDate: new Date(invoice.create_date),
            dueDate: new Date(invoice.due_date),
            totalAmount: parseFloat(invoice.amount.amount),
            balanceAmount: parseFloat(invoice.outstanding.amount),
            status: statusMap[invoice.status] || 'unknown',
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          };

          if (existing) {
            await db
              .update(externalInvoices)
              .set(invoiceData)
              .where(eq(externalInvoices.id, existing.id));
            updated++;
          } else {
            await db.insert(externalInvoices).values({
              organizationId: this.config!.organizationId,
              externalId: invoice.id.toString(),
              externalProvider: 'FRESHBOOKS',
              ...invoiceData,
            });
            created++;
          }

          processed++;
        } catch (error) {
          this.logError('syncInvoices', error, { invoiceId: invoice.id });
          failed++;
        }
      }

      hasMore = response.hasMore;
      page++;
    }

    return { processed, created, updated, failed };
  }

  private async syncPayments(): Promise<{ processed: number; created: number; updated: number; failed: number }> {
    let processed = 0;
    let created = 0;
    let updated = 0;
    let failed = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.client!.getPayments({
        page,
        perPage: this.PER_PAGE,
      });

      for (const payment of response.payments) {
        try {
          const existing = await db.query.externalPayments.findFirst({
            where: and(
              eq(externalPayments.externalId, payment.id.toString()),
              eq(externalPayments.organizationId, this.config!.organizationId),
              eq(externalPayments.externalProvider, 'FRESHBOOKS')
            ),
          });

          const paymentData = {
            customerId: payment.invoiceid.toString(),
            customerName: payment.type, // FreshBooks doesn't provide customer name in payment
            paymentDate: new Date(payment.date),
            amount: parseFloat(payment.amount.amount),
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          };

          if (existing) {
            await db
              .update(externalPayments)
              .set(paymentData)
              .where(eq(externalPayments.id, existing.id));
            updated++;
          } else {
            await db.insert(externalPayments).values({
              organizationId: this.config!.organizationId,
              externalId: payment.id.toString(),
              externalProvider: 'FRESHBOOKS',
              ...paymentData,
            });
            created++;
          }

          processed++;
        } catch (error) {
          this.logError('syncPayments', error, { paymentId: payment.id });
          failed++;
        }
      }

      hasMore = response.hasMore;
      page++;
    }

    return { processed, created, updated, failed };
  }

  private async syncClients(): Promise<{ processed: number; created: number; updated: number; failed: number }> {
    let processed = 0;
    let created = 0;
    let updated = 0;
    let failed = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.client!.getClients({
        page,
        perPage: this.PER_PAGE,
      });

      for (const client of response.clients) {
        try {
          const existing = await db.query.externalCustomers.findFirst({
            where: and(
              eq(externalCustomers.externalId, client.id.toString()),
              eq(externalCustomers.organizationId, this.config!.organizationId),
              eq(externalCustomers.externalProvider, 'FRESHBOOKS')
            ),
          });

          const balance = client.outstanding_balance?.[0]
            ? parseFloat(client.outstanding_balance[0].amount)
            : 0;

          const customerData = {
            name: `${client.fname} ${client.lname}`.trim(),
            companyName: client.organization,
            email: client.email,
            phone: client.business_phone,
            balance,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          };

          if (existing) {
            await db
              .update(externalCustomers)
              .set(customerData)
              .where(eq(externalCustomers.id, existing.id));
            updated++;
          } else {
            await db.insert(externalCustomers).values({
              organizationId: this.config!.organizationId,
              externalId: client.id.toString(),
              externalProvider: 'FRESHBOOKS',
              ...customerData,
            });
            created++;
          }

          processed++;
        } catch (error) {
          this.logError('syncClients', error, { clientId: client.id });
          failed++;
        }
      }

      hasMore = response.hasMore;
      page++;
    }

    return { processed, created, updated, failed };
  }

  private async syncExpenses(): Promise<{ processed: number; created: number; updated: number; failed: number }> {
    let processed = 0;
    let created = 0;
    let updated = 0;
    let failed = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.client!.getExpenses({
        page,
        perPage: this.PER_PAGE,
      });

      for (const expense of response.expenses) {
        try {
          const existing = await db.query.externalAccounts.findFirst({
            where: and(
              eq(externalAccounts.externalId, expense.id.toString()),
              eq(externalAccounts.organizationId, this.config!.organizationId),
              eq(externalAccounts.externalProvider, 'FRESHBOOKS')
            ),
          });

          const accountData = {
            accountName: expense.category_name,
            accountType: 'EXPENSE',
            accountSubType: expense.vendor,
            classification: 'Expense',
            currentBalance: parseFloat(expense.amount.amount),
            isActive: expense.status === 0, // 0=active, 1=archived
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          };

          if (existing) {
            await db
              .update(externalAccounts)
              .set(accountData)
              .where(eq(externalAccounts.id, existing.id));
            updated++;
          } else {
            await db.insert(externalAccounts).values({
              organizationId: this.config!.organizationId,
              externalId: expense.id.toString(),
              externalProvider: 'FRESHBOOKS',
              ...accountData,
            });
            created++;
          }

          processed++;
        } catch (error) {
          this.logError('syncExpenses', error, { expenseId: expense.id });
          failed++;
        }
      }

      hasMore = response.hasMore;
      page++;
    }

    return { processed, created, updated, failed };
  }

  // ==========================================================================
  // Webhook Support
  // ==========================================================================

  async verifyWebhook(payload: string, signature: string): Promise<boolean> {
    // FreshBooks webhook verification
    return true; // Simplified
  }

  async processWebhook(event: WebhookEvent): Promise<void> {
    this.logOperation('webhook', `Processing ${event.eventType}`);
    // Implementation would process FreshBooks webhook events
  }
}
