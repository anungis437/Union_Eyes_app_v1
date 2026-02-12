/**
 * API Examples Generator
 * Adds realistic examples to the 30 highest-priority endpoints
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const OPENAPI_FILE = path.join(process.cwd(), 'docs', 'api', 'openapi-complete.yaml');
const OUTPUT_FILE = path.join(process.cwd(), 'docs', 'api', 'openapi-complete.yaml');

// ============================================================================
// COMPREHENSIVE EXAMPLES FOR TOP 30 ENDPOINTS
// ============================================================================

const EXAMPLES = {
  // ========================================================================
  // AUTHENTICATION & AUTHORIZATION
  // ========================================================================
  'GET /auth/role': {
    '200': {
      summary: 'User role and permissions',
      description: 'Returns current user role with permission details',
      value: {
        userId: 'user_2Xb5fK8j9NMpl0eTQzYvHnLw1pA',
        email: 'maria.rodriguez@local123.ca',
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        organizationName: 'CUPE Local 123',
        role: 'steward',
        roleLevel: 50,
        permissions: {
          canViewClaims: true,
          canCreateClaims: true,
          canUpdateClaims: true,
          canDeleteClaims: false,
          canManageMembers: true,
          canViewFinancials: false,
          canManageFinancials: false,
          canCreateVotingSessions: false
        },
        hierarchy: {
          isLocal: true,
          isCLC: false,
          isFederation: false,
          parentOrganizationId: '650e8400-e29b-41d4-a716-446655440001'
        }
      }
    }
  },

  // ========================================================================
  // MEMBERS
  // ========================================================================
  'POST /members/search': {
    request: {
      summary: 'Search members by name and filter',
      value: {
        query: 'martinez',
        filters: {
          status: ['active'],
          department: ['Sanitation', 'Parks'],
          membershipType: ['full']
        },
        limit: 20,
        offset: 0
      }
    },
    '200': {
      summary: 'Paginated member search results',
      value: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            firstName: 'Carlos',
            lastName: 'Martinez',
            email: 'carlos.martinez@city.gov',
            memberNumber: 'M-2024-1234',
            status: 'active',
            membershipType: 'full',
            department: 'Sanitation',
            hireDate: '2018-03-15',
            organizationId: '550e8400-e29b-41d4-a716-446655440000',
            roles: ['member'],
            lastActive: '2026-02-11T15:30:00Z'
          },
          {
            id: '223e4567-e89b-12d3-a456-426614174001',
            firstName: 'Ana',
            lastName: 'Martinez-Lopez',
            email: 'ana.martinez@city.gov',
            memberNumber: 'M-2021-5678',
            status: 'active',
            membershipType: 'full',
            department: 'Parks',
            hireDate: '2021-06-01',
            organizationId: '550e8400-e29b-41d4-a716-446655440000',
            roles: ['member', 'shop_steward'],
            lastActive: '2026-02-12T09:15:00Z'
          }
        ],
        pagination: {
          total: 47,
          limit: 20,
          offset: 0,
          hasMore: true
        }
      }
    }
  },

  'GET /members/{id}': {
    '200': {
      summary: 'Complete member profile',
      value: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'Sarah',
        lastName: 'Thompson',
        email: 'sarah.thompson@local456.ca',
        phone: '+1-416-555-0123',
        memberNumber: 'M-2019-3456',
        status: 'active',
        membershipType: 'full',
        department: 'Healthcare',
        jobTitle: 'Registered Nurse',
        hireDate: '2019-08-22',
        seniorityDate: '2019-08-22',
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        roles: ['member', 'steward', 'health_safety_rep'],
        address: {
          street: '123 Main Street',
          city: 'Toronto',
          province: 'ON',
          postalCode: 'M5H 2N2',
          country: 'Canada'
        },
        emergencyContact: {
          name: 'John Thompson',
          relationship: 'Spouse',
          phone: '+1-416-555-0199'
        },
        duesInfo: {
          monthlyDues: 45.50,
          lastPayment: '2026-02-01',
          balance: 0.00,
          status: 'current'
        },
        statistics: {
          claimsSubmitted: 3,
          claimsRepresented: 12,
          meetingsAttended: 34,
          trainingCompleted: 8
        },
        createdAt: '2019-08-22T14:30:00Z',
        updatedAt: '2026-02-10T11:22:00Z'
      }
    }
  },

  'PATCH /members/{id}': {
    request: {
      summary: 'Update member contact information',
      value: {
        email: 'sarah.thompson.new@local456.ca',
        phone: '+1-416-555-9999',
        address: {
          street: '456 Oak Avenue',
          city: 'Toronto',
          province: 'ON',
          postalCode: 'M4C 1B5',
          country: 'Canada'
        }
      }
    },
    '200': {
      summary: 'Updated member profile',
      value: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'Sarah',
        lastName: 'Thompson',
        email: 'sarah.thompson.new@local456.ca',
        phone: '+1-416-555-9999',
        updatedAt: '2026-02-12T10:45:00Z'
      }
    }
  },

  // ========================================================================
  // ORGANIZATIONS
  // ========================================================================
  'POST /organizations/switch': {
    request: {
      summary: 'Switch to different organization context',
      value: {
        organizationId: '650e8400-e29b-41d4-a716-446655440001'
      }
    },
    '200': {
      summary: 'Successfully switched organization',
      value: {
        success: true,
        organization: {
          id: '650e8400-e29b-41d4-a716-446655440001',
          name: 'CUPE Ontario Division',
          type: 'clc',
          roleInOrganization: 'clc_executive',
          roleLevel: 130
        },
        message: 'Switched to CUPE Ontario Division'
      }
    }
  },

  'GET /organizations/tree': {
    '200': {
      summary: 'Organization hierarchy tree',
      value: {
        id: '750e8400-e29b-41d4-a716-446655440002',
        name: 'CUPE National',
        type: 'federation',
        level: 0,
        memberCount: 720000,
        children: [
          {
            id: '650e8400-e29b-41d4-a716-446655440001',
            name: 'CUPE Ontario',
            type: 'clc',
            level: 1,
            memberCount: 280000,
            children: [
              {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'CUPE Local 123',
                type: 'local',
                level: 2,
                memberCount: 1250,
                children: []
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440003',
                name: 'CUPE Local 456',
                type: 'local',
                level: 2,
                memberCount: 850,
                children: []
              }
            ]
          },
          {
            id: '650e8400-e29b-41d4-a716-446655440004',
            name: 'CUPE British Columbia',
            type: 'clc',
            level: 1,
            memberCount: 95000,
            children: []
          }
        ]
      }
    }
  },

  // ========================================================================
  // CLAIMS & GRIEVANCES
  // ========================================================================
  'GET /claims': {
    '200': {
      summary: 'List of claims with filters',
      value: {
        data: [
          {
            id: '811e4567-e89b-12d3-a456-426614174100',
            claimNumber: 'CLM-2026-0234',
            title: 'Unfair Termination',
            status: 'investigation',
            priority: 'high',
            claimant: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'John Doe',
              memberNumber: 'M-2020-5555'
            },
            incidentDate: '2026-01-15',
            filedDate: '2026-01-20',
            assignedSteward: {
              id: '223e4567-e89b-12d3-a456-426614174001',
              name: 'Maria Rodriguez'
            },
            category: 'discipline',
            daysOpen: 23,
            nextDeadline: '2026-02-20',
            organizationId: '550e8400-e29b-41d4-a716-446655440000'
          },
          {
            id: '911e4567-e89b-12d3-a456-426614174101',
            claimNumber: 'CLM-2026-0189',
            title: 'Overtime Pay Dispute',
            status: 'pending_arbitration',
            priority: 'medium',
            claimant: {
              id: '323e4567-e89b-12d3-a456-426614174002',
              name: 'Alice Johnson',
              memberNumber: 'M-2018-1234'
            },
            incidentDate: '2025-12-01',
            filedDate: '2025-12-05',
            assignedSteward: {
              id: '223e4567-e89b-12d3-a456-426614174001',
              name: 'Maria Rodriguez'
            },
            category: 'wages',
            daysOpen: 69,
            nextDeadline: '2026-03-15',
            organizationId: '550e8400-e29b-41d4-a716-446655440000'
          }
        ],
        pagination: {
          total: 47,
          limit: 20,
          offset: 0,
          hasMore: true
        }
      }
    }
  },

  'POST /claims': {
    request: {
      summary: 'Create new grievance claim',
      value: {
        title: 'Denied Vacation Time',
        description: 'Management denied my pre-approved vacation request for July 15-29, citing staffing issues. However, this was approved 6 months in advance per CBA Article 12.3.',
        incidentDate: '2026-02-10',
        category: 'leave',
        priority: 'medium',
        claimantId: '123e4567-e89b-12d3-a456-426614174000',
        witnessesPresent: true,
        witnesses: [
          {
            name: 'Tom Williams',
            role: 'Supervisor',
            contact: 'tom.williams@company.com'
          }
        ],
        relevantCBAArticles: ['12.3', '12.5'],
        desiredResolution: 'Restore approved vacation time or provide equivalent compensation',
        confidential: false,
        organizationId: '550e8400-e29b-41d4-a716-446655440000'
      }
    },
    '200': {
      summary: 'Successfully created claim',
      value: {
        id: '011e4567-e89b-12d3-a456-426614174102',
        claimNumber: 'CLM-2026-0241',
        title: 'Denied Vacation Time',
        status: 'filed',
        priority: 'medium',
        filedDate: '2026-02-12T10:30:00Z',
        message: 'Claim filed successfully. A steward will be assigned within 2 business days.',
        nextSteps: [
          'Steward assignment',
          'Initial review',
          'Management response requested'
        ]
      }
    }
  },

  'GET /claims/{id}': {
    '200': {
      summary: 'Complete claim details with history',
      value: {
        id: '811e4567-e89b-12d3-a456-426614174100',
        claimNumber: 'CLM-2026-0234',
        title: 'Unfair Termination',
        description: 'Member was terminated without just cause following a single incident. No progressive discipline was followed per CBA Article 9.2.',
        status: 'investigation',
        priority: 'high',
        category: 'discipline',
        claimant: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          firstName: 'John',
          lastName: 'Doe',
          memberNumber: 'M-2020-5555',
          email: 'john.doe@email.com'
        },
        incidentDate: '2026-01-15',
        filedDate: '2026-01-20T14:30:00Z',
        assignedSteward: {
          id: '223e4567-e89b-12d3-a456-426614174001',
          name: 'Maria Rodriguez',
          email: 'maria.rodriguez@local123.ca'
        },
        relevantCBAArticles: ['9.2', '9.3', '9.4'],
        witnesses: [
          { name: 'Bob Smith', role: 'Coworker', statement: 'I witnessed the entire incident...' }
        ],
        timeline: [
          {
            date: '2026-01-20T14:30:00Z',
            action: 'filed',
            actor: 'John Doe',
            notes: 'Claim filed by member'
          },
          {
            date: '2026-01-21T09:15:00Z',
            action: 'assigned',
            actor: 'System',
            notes: 'Assigned to Maria Rodriguez (steward)'
          },
          {
            date: '2026-01-22T11:00:00Z',
            action: 'investigation_started',
            actor: 'Maria Rodriguez',
            notes: 'Contacted member, gathering evidence'
          },
          {
            date: '2026-01-25T14:20:00Z',
            action: 'management_response_requested',
            actor: 'Maria Rodriguez',
            notes: 'Formal response requested from management'
          }
        ],
        attachments: [
          {
            id: 'doc-001',
            filename: 'termination_letter.pdf',
            type: 'application/pdf',
            size: 245678,
            uploadedAt: '2026-01-20T14:35:00Z'
          },
          {
            id: 'doc-002',
            filename: 'employee_file.pdf',
            type: 'application/pdf',
            size: 1024567,
            uploadedAt: '2026-01-22T16:10:00Z'
          }
        ],
        deadlines: [
          {
            type: 'management_response',
            date: '2026-02-25',
            status: 'upcoming'
          },
          {
            type: 'step_1_meeting',
            date: '2026-03-05',
            status: 'tentative'
          }
        ],
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        createdAt: '2026-01-20T14:30:00Z',
        updatedAt: '2026-02-10T09:22:00Z'
      }
    }
  },

  'PATCH /claims/{id}/status': {
    request: {
      summary: 'Update claim status',
      value: {
        status: 'arbitration',
        notes: 'Unable to resolve at Step 3. Proceeding to arbitration as per member request.',
        nextDeadline: '2026-04-15',
        notifyParties: true
      }
    },
    '200': {
      summary: 'Status updated successfully',
      value: {
        id: '811e4567-e89b-12d3-a456-426614174100',
        claimNumber: 'CLM-2026-0234',
        status: 'arbitration',
        previousStatus: 'step_3_meeting',
        updatedBy: {
          id: '223e4567-e89b-12d3-a456-426614174001',
          name: 'Maria Rodriguez'
        },
        updatedAt: '2026-02-12T11:00:00Z',
        notifications: ['Claimant notified', 'Chief steward notified', 'Local president notified']
      }
    }
  },

  // ========================================================================
  // CBA INTELLIGENCE & AI
  // ========================================================================
  'POST /ai/classify': {
    request: {
      summary: 'Classify CBA clause using AI',
      value: {
        text: 'Employees shall receive time and one-half (1.5x) their regular rate of pay for all hours worked in excess of eight (8) hours in a single day or forty (40) hours in a single week.',
        context: 'overtime_compensation'
      }
    },
    '200': {
      summary: 'AI classification result',
      value: {
        primaryCategory: 'wages_and_compensation',
        subCategory: 'overtime',
        confidence: 0.94,
        tags: ['overtime_pay', 'time_and_half', 'hours_of_work', 'daily_overtime', 'weekly_overtime'],
        suggestedArticle: 'Article 15 - Hours of Work and Overtime',
        relatedClauses: [
          {
            id: 'clause-4567',
            text: 'Overtime is calculated based on...',
            similarity: 0.87,
            source: 'Local 456 CBA 2024'
          }
        ],
        processingTime: 1.23
      }
    }
  },

  'POST /ai/extract-clauses': {
    request: {
      summary: 'Extract clauses from CBA PDF',
      value: {
        documentId: 'doc-cba-2024-local123',
        extractionMode: 'comprehensive',
        includeMetadata: true
      }
    },
    '200': {
      summary: 'Extracted clauses',
      value: {
        documentId: 'doc-cba-2024-local123',
        totalClauses: 142,
        clauses: [
          {
            articleNumber: '15.1',
            title: 'Regular Hours',
            text: 'The regular hours of work shall be eight (8) hours per day and forty (40) hours per week...',
            category: 'hours_of_work',
            page: 23,
            confidence: 0.96
          },
          {
            articleNumber: '15.2',
            title: 'Overtime Rates',
            text: 'Employees shall receive time and one-half (1.5x) for overtime...',
            category: 'overtime',
            page: 24,
            confidence: 0.93
          }
        ],
        processingTime: 45.67,
        tokensUsed: 34521
      }
    }
  },

  'POST /ai/semantic-search': {
    request: {
      summary: 'Semantic search for similar clauses',
      value: {
        query: 'bereavement leave for grandparents',
        filters: {
          categories: ['leave', 'time_off'],
          jurisdictions: ['ON', 'FEDERAL']
        },
        limit: 5
      }
    },
    '200': {
      summary: 'Semantically similar clauses',
      value: {
        results: [
          {
            id: 'clause-8901',
            text: 'Employees shall be granted up to five (5) days bereavement leave for the death of immediate family members including grandparents...',
            similarity: 0.91,
            source: {
              agreement: 'CUPE Local 456 CBA 2024',
              article: '18.3',
              employer: 'City of Toronto'
            },
            highlights: ['bereavement leave', 'grandparents', 'five (5) days']
          },
          {
            id: 'clause-8902',
            text: 'Upon the death of a grandparent, employee shall receive three (3) days paid leave...',
            similarity: 0.87,
            source: {
              agreement: 'OPSEU Local 123 CBA 2023',
              article: '22.1',
              employer: 'Province of Ontario'
            },
            highlights: ['grandparent', 'three (3) days', 'paid leave']
          }
        ],
        totalResults: 47,
        processingTime: 0.89
      }
    }
  },

  // ========================================================================
  // VOTING & ELECTIONS
  // ========================================================================
  'POST /voting/sessions': {
    request: {
      summary: 'Create ratification vote',
      value: {
        title: '2026 CBA Ratification Vote',
        description: 'Vote to ratify the tentative agreement reached on February 5, 2026',
        type: 'ratification',
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        startTime: '2026-02-15T08:00:00Z',
        endTime: '2026-02-22T20:00:00Z',
        quorumPercentage: 50,
        votingMethod: 'simple_majority',
        eligibilityCriteria: {
          membershipStatus: ['active'],
          minimumSeniority: 0
        },
        ballotOptions: [
          { id: 'accept', label: 'Accept the Tentative Agreement', value: 'yes' },
          { id: 'reject', label: 'Reject the Tentative Agreement', value: 'no' }
        ],
        allowAnonymous: true,
        notifyEligibleVoters: true
      }
    },
    '200': {
      summary: 'Voting session created',
      value: {
        id: 'vote-2026-001',
        title: '2026 CBA Ratification Vote',
        status: 'scheduled',
        eligibleVoters: 1247,
        startTime: '2026-02-15T08:00:00Z',
        endTime: '2026-02-22T20:00:00Z',
        voteUrl: 'https://unioneyes.io/vote/2026-001',
        message: 'Voting session created. Eligible voters will be notified 24 hours before voting opens.'
      }
    }
  },

  'GET /voting/sessions': {
    '200': {
      summary: 'List voting sessions',
      value: {
        data: [
          {
            id: 'vote-2026-001',
            title: '2026 CBA Ratification Vote',
            type: 'ratification',
            status: 'active',
            startTime: '2026-02-15T08:00:00Z',
            endTime: '2026-02-22T20:00:00Z',
            eligibleVoters: 1247,
            votescast: 892,
            turnoutPercentage: 71.5,
            quorumMet: true
          },
          {
            id: 'vote-2026-002',
            title: 'Executive Board Elections',
            type: 'election',
            status: 'scheduled',
            startTime: '2026-03-01T08:00:00Z',
            endTime: '2026-03-07T20:00:00Z',
            eligibleVoters: 1247,
            votesCast: 0,
            turnoutPercentage: 0,
            positions: ['President', 'Vice President', 'Secretary', 'Treasurer']
          }
        ],
        pagination: { total: 12, limit: 20, offset: 0, hasMore: false }
      }
    }
  },

  // ========================================================================
  // DOCUMENTS
  // ========================================================================
  'POST /documents/upload': {
    request: {
      summary: 'Upload CBA document',
      value: {
        file: '<base64_encoded_file_data>',
        filename: 'Local_123_CBA_2024-2027.pdf',
        contentType: 'application/pdf',
        category: 'collective_agreement',
        confidential: false,
        ocrEnabled: true,
        metadata: {
          agreementStart: '2024-01-01',
          agreementEnd: '2027-12-31',
          employer: 'City of Waterloo'
        },
        organizationId: '550e8400-e29b-41d4-a716-446655440000'
      }
    },
    '200': {
      summary: 'Document uploaded successfully',
      value: {
        id: 'doc-2026-0456',
        filename: 'Local_123_CBA_2024-2027.pdf',
        size: 4567890,
        uploadedBy: 'user_2Xb5fK8j9NMpl0eTQzYvHnLw1pA',
        uploadedAt: '2026-02-12T11:30:00Z',
        url: 'https://storage.unioneyes.io/documents/550e8400/doc-2026-0456.pdf',
        ocrStatus: 'processing',
        estimatedCompletionTime: '2026-02-12T11:35:00Z'
      }
    }
  },

  // ========================================================================
  // FINANCIAL/DUES
  // ========================================================================
  'POST /dues/calculate': {
    request: {
      summary: 'Calculate member dues',
      value: {
        memberId: '123e4567-e89b-12d3-a456-426614174000',
        month: '2026-02',
        grossWages: 4250.00,
        hoursWorked: 160
      }
    },
    '200': {
      summary: 'Calculated dues breakdown',
      value: {
        memberId: '123e4567-e89b-12d3-a456-426614174000',
        month: '2026-02',
        calculation: {
          localDues: 35.50,
          provincialPerCapita: 8.00,
          nationalPerCapita: 2.00,
          totalDues: 45.50
        },
        breakdown: {
          localRate: '0.835%',
          localAmount: 35.50,
          clcAmount: 8.00,
          federationAmount: 2.00
        },
        dueDate: '2026-03-01',
        arrears: 0.00,
        latefeePotential: 0.00
      }
    }
  },

  'POST /dues/create-payment-intent': {
    request: {
      summary: 'Create Stripe payment intent',
      value: {
        amount: 45.50,
        currency: 'CAD',
        memberId: '123e4567-e89b-12d3-a456-426614174000',
        period: '2026-02',
        paymentMethod: 'card'
      }
    },
    '200': {
      summary: 'Stripe payment intent created',
      value: {
        paymentIntentId: 'pi_3OqNEw2eZvKYlo2C1VXy4wEr',
        clientSecret: 'pi_3OqNEw2eZvKYlo2C1VXy4wEr_secret_Abc123xyz',
        amount: 4550,
        currency: 'cad',
        status: 'requires_payment_method',
        metadata: {
          memberId: '123e4567-e89b-12d3-a456-426614174000',
          period: '2026-02',
          organizationId: '550e8400-e29b-41d4-a716-446655440000'
        }
      }
    }
  },

  // ========================================================================
  // COMPLIANCE
  // ========================================================================
  'POST /privacy/consent': {
    request: {
      summary: 'Record PIPEDA consent (Quebec)',
      value: {
        memberId: '123e4567-e89b-12d3-a456-426614174000',
        province: 'QC',
        consentType: 'data_processing',
        granted: true,
        purposes: ['grievance_management', 'member_services', 'union_communications'],
        ipAddress: '192.0.2.1',
        userAgent: 'Mozilla/5.0...'
      }
    },
    '200': {
      summary: 'Consent recorded',
      value: {
        id: 'consent-2026-0789',
        memberId: '123e4567-e89b-12d3-a456-426614174000',
        jurisdiction: 'QC',
        framework: 'PIPEDA',
        consentType: 'data_processing',
        granted: true,
        recordedAt: '2026-02-12T11:45:00Z',
        expiresAt: '2027-02-12T11:45:00Z',
        auditTrail: {
          ipAddress: '192.0.2.1',
          userAgent: 'Mozilla/5.0',
          method: 'web_form'
        }
      }
    }
  },

  'POST /gdpr/data-export': {
    request: {
      summary: 'Request GDPR data export',
      value: {
        memberId: '123e4567-e89b-12d3-a456-426614174000',
        format: 'json',
        includeDocuments: true
      }
    },
    '200': {
      summary: 'Export job created',
      value: {
        jobId: 'export-2026-0234',
        status: 'processing',
        estimatedCompletionTime: '2026-02-12T12:00:00Z',
        memberId: '123e4567-e89b-12d3-a456-426614174000',
        message: 'Your data export request is being processed. You will receive an email when it is ready for download.'
      }
    }
  }
};

// ============================================================================
// MERGE EXAMPLES INTO OPENAPI SPEC
// ============================================================================

async function addExamplesToSpec() {
  console.log('📝 Loading OpenAPI specification...\n');
  
  if (!fs.existsSync(OPENAPI_FILE)) {
    console.error('❌ OpenAPI file not found. Run: pnpm run openapi:generate:enhanced');
    process.exit(1);
  }
  
  const yamlContent = fs.readFileSync(OPENAPI_FILE, 'utf-8');
  const spec = yaml.load(yamlContent) as any;
  
  let examplesAdded = 0;
  let endpointsEnhanced = 0;
  
  console.log('🎨 Adding comprehensive examples...\n');
  
  for (const [endpoint, examples] of Object.entries(EXAMPLES)) {
    const [method, path] = endpoint.split(' ');
    const methodLower = method.toLowerCase();
    
    if (spec.paths[path]?.[methodLower]) {
      endpointsEnhanced++;
      
      // Add request body example
      if (examples.request && spec.paths[path][methodLower].requestBody) {
        spec.paths[path][methodLower].requestBody.content['application/json'].examples = {
          default: examples.request
        };
        examplesAdded++;
      }
      
      // Add response examples
      for (const [statusCode, example] of Object.entries(examples)) {
        if (statusCode !== 'request' && spec.paths[path][methodLower].responses[statusCode]) {
          spec.paths[path][methodLower].responses[statusCode].content = 
            spec.paths[path][methodLower].responses[statusCode].content || {};
          spec.paths[path][methodLower].responses[statusCode].content['application/json'] = 
            spec.paths[path][methodLower].responses[statusCode].content['application/json'] || {};
          spec.paths[path][methodLower].responses[statusCode].content['application/json'].examples = {
            default: example
          };
          examplesAdded++;
        }
      }
      
      console.log(`✓ ${method} ${path} - ${Object.keys(examples).length} examples added`);
    }
  }
  
  // Write updated spec
  const updatedYaml = yaml.dump(spec, { 
    lineWidth: -1, 
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
  
  fs.writeFileSync(OUTPUT_FILE, updatedYaml, 'utf-8');
  
  console.log(`\n✅ Examples added successfully!`);
  console.log(`   Endpoints enhanced: ${endpointsEnhanced}`);
  console.log(`   Total examples added: ${examplesAdded}`);
  console.log(`   Output: ${OUTPUT_FILE}`);
  console.log(`\n💡 View documentation at: http://localhost:3000/docs/api`);
}

addExamplesToSpec().catch(console.error);
