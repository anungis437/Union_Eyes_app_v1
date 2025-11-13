/**
 * BillingService Tests
 * 
 * Tests subscription management, usage tracking, and webhook handling.
 */

import { BillingService } from '../billingService';
import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

// Mock Supabase client
const createMockSupabase = (): jest.Mocked<SupabaseClient> => {
  return {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  } as any;
};

describe('BillingService', () => {
  let service: BillingService;
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    mockStripe = new Stripe('sk_test_123', { apiVersion: '2024-06-20' as any }) as jest.Mocked<Stripe>;
    service = new BillingService(mockSupabase, 'sk_test_123');
  });

  describe('createSubscription', () => {
    it('should create Stripe customer and subscription', async () => {
      const mockCustomer = { id: 'cus_123' };
      const mockSubscription = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        current_period_start: 1234567890,
        current_period_end: 1234567990,
      };

      mockStripe.customers = {
        create: jest.fn().mockResolvedValue(mockCustomer),
      } as any;

      mockStripe.subscriptions = {
        create: jest.fn().mockResolvedValue(mockSubscription),
      } as any;

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await service.createSubscription({
        organization_id: 'org-123',
        price_id: 'price_123',
      });

      expect(result).toBeDefined();
      expect(mockStripe.customers.create).toHaveBeenCalled();
      expect(mockStripe.subscriptions.create).toHaveBeenCalled();
    });
  });

  describe('getSubscription', () => {
    it('should retrieve subscription by organization id', async () => {
      const mockSub = {
        id: 'sub-123',
        organization_id: 'org-123',
        stripe_subscription_id: 'sub_123',
        status: 'active',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockSub, error: null }),
            }),
          }),
        }),
      } as any);

      const result = await service.getSubscription('org-123');

      expect(result).toEqual(mockSub);
      expect(mockSupabase.from).toHaveBeenCalledWith('billing_subscriptions');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel Stripe subscription', async () => {
      const mockSub = {
        stripe_subscription_id: 'sub_123',
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockSub, error: null }),
            }),
          }),
        }),
      } as any).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      mockStripe.subscriptions = {
        update: jest.fn().mockResolvedValue({ id: 'sub_123', cancel_at_period_end: true }),
      } as any;

      await service.cancelSubscription('org-123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_123',
        { cancel_at_period_end: true }
      );
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage metric', async () => {
      const mockUsage = {
        id: 'usage-123',
        users_count: 5,
        matters_count: 10,
        storage_bytes: 1000000,
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockUsage, error: null }),
                }),
              }),
            }),
          }),
        }),
      } as any).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      await service.incrementUsage('org-123', 'users_count', 1);

      expect(mockSupabase.from).toHaveBeenCalledWith('billing_usage');
    });

    it('should create usage record if none exists', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      } as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      } as any);

      await service.incrementUsage('org-123', 'users_count', 1);

      expect(mockSupabase.from).toHaveBeenCalledWith('billing_usage');
    });
  });

  describe('getUsageMetrics', () => {
    it('should calculate usage percentages', async () => {
      const mockSubscription = {
        plan: 'professional',
      };

      const mockUsage = {
        users_count: 5,
        matters_count: 50,
        storage_bytes: 50 * 1024 * 1024 * 1024, // 50GB
        api_calls_count: 5000,
      };

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockSubscription, error: null }),
              }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockUsage, error: null }),
                  }),
                }),
              }),
            }),
          }),
        } as any);

      const result = await service.getUsageMetrics('org-123');

      expect(result).toBeDefined();
      expect(result.usage_percentage).toBeDefined();
      expect(result.usage_percentage.users).toBeGreaterThan(0);
    });
  });

  describe('handleWebhook', () => {
    it('should handle subscription.updated event', async () => {
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            current_period_start: 1234567890,
            current_period_end: 1234567990,
            cancel_at_period_end: false,
          },
        },
      } as Stripe.Event;

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await service.handleWebhook(mockEvent);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('billing_subscriptions');
    });

    it('should handle subscription.deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
          },
        },
      } as Stripe.Event;

      mockSupabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        } as any)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { organization_id: 'org-123' }, error: null }),
            }),
          }),
        } as any)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        } as any);

      const result = await service.handleWebhook(mockEvent);

      expect(result.success).toBe(true);
    });

    it('should handle invoice.payment_succeeded event', async () => {
      const mockEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            subscription: 'sub_123',
            amount_paid: 9900,
            created: 1234567890,
          },
        },
      } as Stripe.Event;

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await service.handleWebhook(mockEvent);

      expect(result.success).toBe(true);
    });

    it('should handle invoice.payment_failed event', async () => {
      const mockEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            subscription: 'sub_123',
          },
        },
      } as Stripe.Event;

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await service.handleWebhook(mockEvent);

      expect(result.success).toBe(true);
    });
  });
});
