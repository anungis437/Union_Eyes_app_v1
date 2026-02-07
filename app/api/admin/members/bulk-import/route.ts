import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Bulk Import Members API
 * 
 * Import multiple union members from CSV/Excel with validation.
 * Features:
 * - CSV and Excel file parsing
 * - Member validation (required fields, email format, unique membership numbers)
 * - Batch creation with rollback on error
 * - Import preview mode
 * 
 * @module app/api/admin/members/bulk-import/route
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { db as drizzleDb } from "@/db";
import { organizationMembers } from "@/db/schema-organizations";
import { organizations } from "@/db/schema-organizations";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

// Type definitions for import
interface ImportRow {
  organizationSlug: string;
  name: string;
  email: string;
  membershipNumber?: string;
  phone?: string;
  status?: "active" | "inactive" | "suspended";
  role?: "member" | "steward" | "officer" | "admin";
  joinedDate?: string;
  department?: string;
  position?: string;
  hireDate?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  created: number;
  errors: ValidationError[];
  preview?: ImportRow[];
}

/**
 * Helper to check if user has admin/officer role
 */
async function checkAdminOrOfficerRole(userId: string): Promise<boolean> {
  try {
    const member = await drizzleDb.query.organizationMembers.findFirst({
      where: (org, { eq: eqOp }) =>
        eqOp(org.userId, userId),
    });

    return member ? ['admin', 'super_admin', 'officer'].includes(member.role) : false;
  } catch (error) {
    logger.error('Failed to check admin/officer role:', { error });
    return false;
  }
}

// =====================================================
// POST - Bulk Import Members
// =====================================================

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(90, async (request, context) => {
    const { userId } = context;

  try {
      // Check admin/officer role
      const hasPermission = await checkAdminOrOfficerRole(userId);
      if (!hasPermission) {
        return NextResponse.json(
          { error: "Forbidden - Admin or Officer role required" },
          { status: 403 }
        );
      }

      const formData = await request.formData();
      const file = formData.get("file") as File;
      const preview = formData.get("preview") === "true";
      const organizationId = formData.get("organizationId") as string | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      // Validate file type
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Please upload CSV or Excel file" },
          { status: 400 }
        );
      }

      // Parse file content
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        return NextResponse.json(
          { error: "File is empty or invalid" },
          { status: 400 }
        );
      }

      // Validate and process rows
      const validationErrors: ValidationError[] = [];
      const validRows: ImportRow[] = [];

      // Get all unique organization slugs from the CSV
      const orgSlugs = Array.from(new Set(rows.map(r => r.organizationSlug).filter(Boolean)));
      
      // Fetch organization IDs for all slugs
      const orgList = await db
        .select({ id: organizations.id, slug: organizations.slug })
        .from(organizations)
        .where(inArray(organizations.slug, orgSlugs));
      
      const orgSlugToId = new Map(orgList.map(org => [org.slug, org.id]));

      // Track membership numbers to check for duplicates within the import
      const membershipNumbersByOrg = new Map<string, Set<string>>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 for 1-based index and header row

        // Validate required fields
        if (!row.name?.trim()) {
          validationErrors.push({
            row: rowNum,
            field: "name",
            message: "Name is required",
          });
          continue;
        }

        if (!row.email?.trim()) {
          validationErrors.push({
            row: rowNum,
            field: "email",
            message: "Email is required",
          });
          continue;
        }

        if (!row.organizationSlug?.trim()) {
          validationErrors.push({
            row: rowNum,
            field: "organizationSlug",
            message: "Organization slug is required",
          });
          continue;
        }

        // Validate organization exists
        if (!orgSlugToId.has(row.organizationSlug)) {
          validationErrors.push({
            row: rowNum,
            field: "organizationSlug",
            message: `Organization with slug "${row.organizationSlug}" not found`,
          });
          continue;
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          validationErrors.push({
            row: rowNum,
            field: "email",
            message: "Invalid email format",
          });
          continue;
        }

        // Validate status if provided
        if (row.status && !["active", "inactive", "suspended"].includes(row.status)) {
          validationErrors.push({
            row: rowNum,
            field: "status",
            message: "Status must be one of: active, inactive, suspended",
          });
          continue;
        }

        // Validate role if provided
        if (row.role && !["member", "steward", "officer", "admin"].includes(row.role)) {
          validationErrors.push({
            row: rowNum,
            field: "role",
            message: "Role must be one of: member, steward, officer, admin",
          });
          continue;
        }

        // Check for duplicate membership numbers within the import
        if (row.membershipNumber) {
          const orgId = orgSlugToId.get(row.organizationSlug)!;
          if (!membershipNumbersByOrg.has(orgId)) {
            membershipNumbersByOrg.set(orgId, new Set());
          }
          
          const orgMembershipNumbers = membershipNumbersByOrg.get(orgId)!;
          if (orgMembershipNumbers.has(row.membershipNumber)) {
            validationErrors.push({
              row: rowNum,
              field: "membershipNumber",
              message: `Duplicate membership number "${row.membershipNumber}" in import file`,
            });
            continue;
          }
          orgMembershipNumbers.add(row.membershipNumber);
        }

        // Validate date formats if provided
        if (row.joinedDate && !isValidDate(row.joinedDate)) {
          validationErrors.push({
            row: rowNum,
            field: "joinedDate",
            message: "Invalid date format. Use YYYY-MM-DD",
          });
          continue;
        }

        if (row.hireDate && !isValidDate(row.hireDate)) {
          validationErrors.push({
            row: rowNum,
            field: "hireDate",
            message: "Invalid date format. Use YYYY-MM-DD",
          });
          continue;
        }

        validRows.push(row);
      }

      // If preview mode, return validation results
      if (preview) {
        return NextResponse.json({
          success: true,
          preview: validRows.slice(0, 10), // Show first 10 rows in preview
          errors: validationErrors,
          totalRows: rows.length,
          validRows: validRows.length,
          invalidRows: validationErrors.length,
        });
      }

      // Check for existing membership numbers in database
      const membershipNumbersToCheck = validRows
        .filter(row => row.membershipNumber)
        .map(row => ({
          orgId: orgSlugToId.get(row.organizationSlug)!,
          membershipNumber: row.membershipNumber!,
        }));

      if (membershipNumbersToCheck.length > 0) {
        // Group by organization for efficient querying
        const orgIds = Array.from(new Set(membershipNumbersToCheck.map(m => m.orgId)));
        
        for (const orgId of orgIds) {
          const numbersForOrg = membershipNumbersToCheck
            .filter(m => m.orgId === orgId)
            .map(m => m.membershipNumber);

          const existingMembers = await db
            .select({ 
              membershipNumber: organizationMembers.membershipNumber,
              organizationId: organizationMembers.organizationId 
            })
            .from(organizationMembers)
            .where(
              and(
                eq(organizationMembers.organizationId, orgId),
                inArray(organizationMembers.membershipNumber, numbersForOrg)
              )
            );

          const existingNumbersSet = new Set(
            existingMembers.map(m => m.membershipNumber)
          );

          // Add validation errors for existing membership numbers
          for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            if (
              row.membershipNumber &&
              orgSlugToId.get(row.organizationSlug) === orgId &&
              existingNumbersSet.has(row.membershipNumber)
            ) {
              validationErrors.push({
                row: i + 2,
                field: "membershipNumber",
                message: `Member with membership number "${row.membershipNumber}" already exists in this organization`,
              });
            }
          }
        }
      }

      // If there are any validation errors, return them
      if (validationErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            errors: validationErrors,
            message: `Found ${validationErrors.length} validation error(s)`,
          },
          { status: 400 }
        );
      }

      // Create members in batch
      const createdMembers: any[] = [];
      
      // Batch insert all members
      try {
        const membersToInsert = validRows.map(row => ({
          organizationId: orgSlugToId.get(row.organizationSlug)!,
          userId: "", // Will be updated when user claims profile
          name: row.name,
          email: row.email,
          phone: row.phone || null,
          role: (row.role || "member") as any,
          status: (row.status || "active") as any,
          department: row.department || null,
          position: row.position || null,
          hireDate: row.hireDate ? new Date(row.hireDate) : null,
          membershipNumber: row.membershipNumber || null,
          seniority: 0,
          unionJoinDate: row.joinedDate ? new Date(row.joinedDate) : null,
        }));

        const insertedMembers = await db
          .insert(organizationMembers)
          .values(membersToInsert)
          .returning();

        createdMembers.push(...insertedMembers);
      } catch (error) {
        console.error("Error inserting members:", error);
        return NextResponse.json(
          { 
            error: "Failed to create members", 
            details: error instanceof Error ? error.message : "Unknown error" 
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        created: createdMembers.length,
        errors: [],
        data: createdMembers,
        message: `Successfully imported ${createdMembers.length} member(s)`,
      });
    } catch (error) {
      console.error("Error bulk importing members:", error);
      return NextResponse.json(
        { 
          error: "Failed to bulk import members",
          details: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
      );
    }
    })(request);
};

// =====================================================
// Helper Functions
// =====================================================

function parseCSV(text: string): ImportRow[] {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: any = {};

    headers.forEach((header, index) => {
      const value = values[index];
      
      // Skip empty values
      if (value) {
        row[header] = value;
      }
    });

    rows.push(row);
  }

  return rows;
}

function isValidDate(dateString: string): boolean {
  // Check YYYY-MM-DD format
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
