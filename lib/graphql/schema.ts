/**
 * GraphQL Schema Definition
 * 
 * Provides GraphQL API alongside existing REST endpoints
 * Supports queries, mutations, and subscriptions
 */

import { createSchema } from 'graphql-yoga';

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    # Scalars
    scalar DateTime
    scalar JSON

    # Enums
    enum ClaimStatus {
      OPEN
      IN_PROGRESS
      RESOLVED
      CLOSED
    }

    enum ClaimPriority {
      LOW
      MEDIUM
      HIGH
      URGENT
    }

    enum MemberStatus {
      ACTIVE
      INACTIVE
      SUSPENDED
    }

    enum VoteStatus {
      DRAFT
      ACTIVE
      CLOSED
      CANCELLED
    }

    # Types
    type Claim {
      id: ID!
      title: String!
      description: String
      status: ClaimStatus!
      priority: ClaimPriority!
      claimantId: ID!
      claimant: Member
      assignedTo: ID
      assignee: User
      createdAt: DateTime!
      updatedAt: DateTime!
      resolvedAt: DateTime
    }

    type Member {
      id: ID!
      firstName: String!
      lastName: String!
      email: String!
      phone: String
      membershipNumber: String!
      status: MemberStatus!
      joinedAt: DateTime!
      claims: [Claim!]!
    }

    type User {
      id: ID!
      firstName: String!
      lastName: String!
      email: String!
      role: String!
      createdAt: DateTime!
    }

    type Vote {
      id: ID!
      title: String!
      description: String
      startDate: DateTime!
      endDate: DateTime!
      status: VoteStatus!
      eligibleVoters: Int!
      totalVotes: Int!
      options: [VoteOption!]!
    }

    type VoteOption {
      id: ID!
      label: String!
      voteCount: Int!
    }

    type Organization {
      id: ID!
      name: String!
      type: String!
      province: String!
      memberCount: Int!
      createdAt: DateTime!
    }

    # Pagination
    type PageInfo {
      hasNextPage: Boolean!
      hasPreviousPage: Boolean!
      startCursor: String
      endCursor: String
    }

    type ClaimConnection {
      edges: [ClaimEdge!]!
      pageInfo: PageInfo!
      totalCount: Int!
    }

    type ClaimEdge {
      node: Claim!
      cursor: String!
    }

    type MemberConnection {
      edges: [MemberEdge!]!
      pageInfo: PageInfo!
      totalCount: Int!
    }

    type MemberEdge {
      node: Member!
      cursor: String!
    }

    # Inputs
    input CreateClaimInput {
      title: String!
      description: String!
      priority: ClaimPriority!
      claimantId: ID!
    }

    input UpdateClaimInput {
      title: String
      description: String
      status: ClaimStatus
      priority: ClaimPriority
      assignedTo: ID
    }

    input ClaimFilters {
      status: ClaimStatus
      priority: ClaimPriority
      claimantId: ID
      assignedTo: ID
    }

    input PaginationInput {
      first: Int
      after: String
      last: Int
      before: String
    }

    # Queries
    type Query {
      # Claims
      claim(id: ID!): Claim
      claims(
        filters: ClaimFilters
        pagination: PaginationInput
      ): ClaimConnection!

      # Members
      member(id: ID!): Member
      members(
        status: MemberStatus
        pagination: PaginationInput
      ): MemberConnection!

      # Voting
      vote(id: ID!): Vote
      votes(status: VoteStatus): [Vote!]!

      # Organization
      organization: Organization!

      # System
      systemStatus: SystemStatus!
    }

    # Mutations
    type Mutation {
      # Claims
      createClaim(input: CreateClaimInput!): Claim!
      updateClaim(id: ID!, input: UpdateClaimInput!): Claim!
      deleteClaim(id: ID!): Boolean!

      # Members
      updateMemberStatus(id: ID!, status: MemberStatus!): Member!

      # Voting
      castVote(voteId: ID!, optionId: ID!): Boolean!
    }

    # Subscriptions
    type Subscription {
      # Real-time claim updates
      claimCreated: Claim!
      claimUpdated(id: ID): Claim!

      # Real-time vote updates
      voteUpdated(id: ID!): Vote!
    }

    # System Status
    type SystemStatus {
      status: String!
      services: [ServiceHealth!]!
      uptime: Float!
      version: String!
      timestamp: DateTime!
    }

    type ServiceHealth {
      name: String!
      status: String!
      responseTime: Int
      message: String
      lastChecked: DateTime!
    }
  `,
});
