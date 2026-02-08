import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * CBA API Routes - Individual CBA operations
 * GET /api/cbas/[id] - Get CBA by ID with related data
 * PATCH /api/cbas/[id] - Update CBA
 * DELETE /api/cbas/[id] - Delete CBA (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getCBAById, 
  updateCBA, 
  deleteCBA,
  updateCBAStatus 
} from "@/lib/services/cba-service";
import { getClausesByCBAId } from "@/lib/services/clause-service";
import { getBargainingNotesByCBA } from "@/lib/services/bargaining-notes-service";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
  try {
      const { id } = params;
      const { searchParams } = new URL(request.url);

      const includeClauses = searchParams.get("includeClauses") === "true";
      const includeNotes = searchParams.get("includeNotes") === "true";
      const includeAnalytics = searchParams.get("includeAnalytics") === "true";

      // Fetch CBA
      const cba = await getCBAById(id, { 
        includeClauses, 
        includeAnalytics 
      });

      if (!cba) {
        return NextResponse.json({ error: "CBA not found" }, { status: 404 });
      }

      const response: any = { cba };

      // Optionally fetch clauses
      if (includeClauses) {
        const clauses = await getClausesByCBAId(id);
        response.clauses = clauses;
        response.clauseCount = clauses.length;
      }

      // Optionally fetch bargaining notes
      if (includeNotes) {
        const notes = await getBargainingNotesByCBA(id);
        response.bargainingNotes = notes;
        response.noteCount = notes.length;
      }

      return NextResponse.json(response);
    } catch (error) {
      console.error("Error fetching CBA:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      const { id } = params;
      const body = await request.json();

      // If only updating status, use specialized function
      if (body.status && Object.keys(body).length === 1) {
        const updatedCba = await updateCBAStatus(id, body.status);
        
        if (!updatedCba) {
          return NextResponse.json({ error: "CBA not found" }, { status: 404 });
        }

        return NextResponse.json({ cba: updatedCba });
      }

      // Update CBA
      const updatedCba = await updateCBA(id, {
        ...body,
        lastModifiedBy: userId,
      });

      if (!updatedCba) {
        return NextResponse.json({ error: "CBA not found" }, { status: 404 });
      }

      return NextResponse.json({ cba: updatedCba });
    } catch (error) {
      console.error("Error updating CBA:", error);
      
      // Handle unique constraint violations
      if ((error as any)?.code === "23505") {
        return NextResponse.json(
          { error: "CBA number already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
  try {
      const { id } = params;
      const { searchParams } = new URL(request.url);
      const hardDelete = searchParams.get("hard") === "true";

      if (hardDelete) {
        // Hard delete - this will cascade delete all related clauses
        // Only allow for admins/authorized users
        const success = await deleteCBA(id); // This does soft delete by default
        
        if (!success) {
          return NextResponse.json({ error: "CBA not found" }, { status: 404 });
        }

        return NextResponse.json({ 
          message: "CBA archived successfully",
          deleted: true 
        });
      } else {
        // Soft delete - set status to archived
        const success = await deleteCBA(id);
        
        if (!success) {
          return NextResponse.json({ error: "CBA not found" }, { status: 404 });
        }

        return NextResponse.json({ 
          message: "CBA archived successfully",
          deleted: true 
        });
      }
    } catch (error) {
      console.error("Error deleting CBA:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request, { params });
};
