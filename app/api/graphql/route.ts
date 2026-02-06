/**
 * GraphQL API Endpoint
 * 
 * POST /api/graphql - GraphQL endpoint with GraphiQL playground
 * 
 * Features:
 * - GraphQL queries, mutations, subscriptions
 * - Interactive GraphiQL IDE in development
 * - Type-safe schema with TypeScript
 * - Integrates with existing database
 */

import { createYoga } from 'graphql-yoga';
import { schema } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  // Enable GraphiQL playground in development
  graphiql: process.env.NODE_ENV !== 'production',
  fetchAPI: {
    Request: Request,
    Response: Response,
  },
});

export { yoga as GET, yoga as POST };
