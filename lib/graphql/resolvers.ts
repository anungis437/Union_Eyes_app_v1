/**
 * GraphQL Resolvers
 * 
 * Resolver functions for GraphQL queries, mutations, and subscriptions
 */

import { db } from '@/db';
import { claims, profiles } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSystemStatus } from '@/lib/monitoring';
import type { YogaInitialContext } from 'graphql-yoga';

export const resolvers = {
  Query: {
    // Claims
    claim: async (_parent: any, { id }: { id: string }, _context: YogaInitialContext) => {
      const result = await db.select().from(claims).where(eq(claims.claimId, id)).limit(1);
      return result[0] || null;
    },

    claims: async (
      _parent: any,
      { filters, pagination }: any,
      _context: YogaInitialContext
    ) => {
      const limit = pagination?.first || 20;
      const offset = 0; // Calculate from cursor in production
      
      let query = db.select().from(claims);

      if (filters?.status) {
        query = query.where(eq(claims.status, filters.status)) as typeof query;
      }

      const results = await query.limit(limit).offset(offset).orderBy(desc(claims.createdAt));
      
      return {
        edges: results.map((claim, index) => ({
          node: claim,
          cursor: Buffer.from(`${index}`).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: results.length === limit,
          hasPreviousPage: offset > 0,
          startCursor: results.length > 0 ? Buffer.from('0').toString('base64') : null,
          endCursor: results.length > 0 ? Buffer.from(`${results.length - 1}`).toString('base64') : null,
        },
        totalCount: results.length,
      };
    },

    // Members
    member: async (_parent: any, { id }: { id: string }, _context: YogaInitialContext) => {
      const result = await db.select().from(profiles).where(eq(profiles.userId, id)).limit(1);
      return result[0] || null;
    },

    members: async (
      _parent: any,
      { status, pagination }: any,
      _context: YogaInitialContext
    ) => {
      const limit = pagination?.first || 20;
      const offset = 0;

      let query = db.select().from(profiles);

      if (status) {
        query = query.where(eq(profiles.status, status)) as typeof query;
      }

      const results = await query.limit(limit).offset(offset);

      return {
        edges: results.map((member, index) => ({
          node: member,
          cursor: Buffer.from(`${index}`).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: results.length === limit,
          hasPreviousPage: offset > 0,
          startCursor: results.length > 0 ? Buffer.from('0').toString('base64') : null,
          endCursor: results.length > 0 ? Buffer.from(`${results.length - 1}`).toString('base64') : null,
        },
        totalCount: results.length,
      };
    },

    // System Status
    systemStatus: async () => {
      return await getSystemStatus();
    },
  },

  Mutation: {
    // Claims
    createClaim: async (
      _parent: any,
      { input }: { input: any },
      _context: YogaInitialContext
    ) => {
      const result = await db.insert(claims).values({
        claimNumber: `CLM-${Date.now()}`,
        organizationId: input.organizationId,
        memberId: input.memberId,
        claimType: input.claimType || 'other',
        status: 'submitted',
        priority: input.priority || 'medium',
        incidentDate: input.incidentDate || new Date(),
        location: input.location || 'Not specified',
        description: input.description,
        desiredOutcome: input.desiredOutcome || 'Not specified',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return result[0];
    },

    updateClaim: async (
      _parent: any,
      { id, input }: { id: string; input: any },
      _context: YogaInitialContext
    ) => {
      const result = await db
        .update(claims)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(claims.claimId, id))
        .returning();

      return result[0];
    },

    deleteClaim: async (
      _parent: any,
      { id }: { id: string },
      _context: YogaInitialContext
    ) => {
      await db.delete(claims).where(eq(claims.claimId, id));
      return true;
    },

    // Voting
    castVote: async (
      _parent: any,
      { voteId, optionId }: { voteId: string; optionId: string },
      _context: YogaInitialContext
    ) => {
      // Implementation would record the vote
      return true;
    },
  },

  // Field Resolvers
  Claim: {
    claimant: async (parent: any, _args: any, _context: YogaInitialContext) => {
      if (!parent.memberId) return null;
      const result = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, parent.memberId))
        .limit(1);
      return result[0] || null;
    },

    assignee: async (parent: any, _args: any, _context: YogaInitialContext) => {
      if (!parent.assignedTo) return null;
      const result = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, parent.assignedTo))
        .limit(1);
      return result[0] || null;
    },
  },

  Member: {
    claims: async (parent: any, _args: any, _context: YogaInitialContext) => {
      const results = await db
        .select()
        .from(claims)
        .where(eq(claims.memberId, parent.userId));
      return results;
    },
  },
};

