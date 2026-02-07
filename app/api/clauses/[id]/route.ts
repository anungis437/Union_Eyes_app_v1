import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Clause API Routes - Individual clause operations
 * GET /api/clauses/[id] - Get clause by ID
 * PATCH /api/clauses/[id] - Update clause
 * DELETE /api/clauses/[id] - Delete clause
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getClauseById, 
  updateClause, 
  deleteClause,
  getClauseHierarchy
} from "@/lib/services/clause-service";
import { z } from "zod";
import { withEnhancedRoleAuth } from "@/lib/enterprise-role-middleware";

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(10, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { id } = params;
      const { searchParams } = new URL(request.url);

      const includeHierarchy = searchParams.get("includeHierarchy") === "true";

      if (includeHierarchy) {
        const hierarchy = await getClauseHierarchy(id);
        
        if (!hierarchy.clause) {
          return NextResponse.json({ error: "Clause not found" }, { status: 404 });
        }

        return NextResponse.json(hierarchy);
      }

      // Fetch clause
      const clause = await getClauseById(id);

      if (!clause) {
        return NextResponse.json({ error: "Clause not found" }, { status: 404 });
      }

      return NextResponse.json({ clause });
    } catch (error) {
      console.error("Error fetching clause:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  })
  })(request, { params });
};

export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { id } = params;
      const body = await request.json();

      // Update clause
      const updatedClause = await updateClause(id, body);

      if (!updatedClause) {
        return NextResponse.json({ error: "Clause not found" }, { status: 404 });
      }

      return NextResponse.json({ clause: updatedClause });
    } catch (error) {
      console.error("Error updating clause:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  })
  })(request, { params });
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const user = { id: context.userId, organizationId: context.organizationId };

  try {
      const { id } = params;

      const success = await deleteClause(id);
      
      if (!success) {
        return NextResponse.json({ error: "Clause not found" }, { status: 404 });
      }

      return NextResponse.json({ 
        message: "Clause deleted successfully",
        deleted: true 
      });
    } catch (error) {
      console.error("Error deleting clause:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  })
  })(request, { params });
};
