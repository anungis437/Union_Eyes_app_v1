import { logApiAuditEvent } from "@/lib/middleware/api-security";
/**
 * Bargaining Notes API Routes - Main endpoints
 * GET /api/bargaining-notes - List notes with filtering
 * POST /api/bargaining-notes - Create a new note
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  listBargainingNotes, 
  createBargainingNote,
  bulkCreateBargainingNotes,
  searchBargainingNotes,
  getBargainingTimeline,
  getBargainingNotesStatistics,
  getNotesByTags,
  getSessionTypes
} from "@/lib/services/bargaining-notes-service";
import { z } from "zod";
import { withApiAuth, withRoleAuth, withMinRole, withAdminAuth, getCurrentUser } from '@/lib/api-auth-guard';

export const GET = async (request: NextRequest) => {
  return withRoleAuth(10, async (request, context) => {
  try {
      const { searchParams } = new URL(request.url);
      
      // Check for special modes
      const timeline = searchParams.get("timeline") === "true";
      const statistics = searchParams.get("statistics") === "true";
      const sessionTypes = searchParams.get("sessionTypes") === "true";
      const cbaId = searchParams.get("cbaId");
      const organizationId = searchParams.get("organizationId");
  if (organizationId && organizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }


      // Return timeline
      if (timeline && cbaId) {
        const timelineData = await getBargainingTimeline(cbaId);
        return NextResponse.json({ timeline: timelineData });
      }

      // Return statistics
      if (statistics && organizationId) {
        const stats = await getBargainingNotesStatistics(organizationId);
        return NextResponse.json(stats);
      }

      // Return session types
      if (sessionTypes && organizationId) {
        const types = await getSessionTypes(organizationId);
        return NextResponse.json({ sessionTypes: types });
      }

      // Check for tags filter
      const tags = searchParams.get("tags");
      if (tags) {
        const tagArray = tags.split(",");
        const limit = parseInt(searchParams.get("limit") || "50");
        const notes = await getNotesByTags(tagArray, organizationId || undefined, limit);
        return NextResponse.json({ notes, count: notes.length });
      }

      // Build filters
      const filters: any = {};
      
      if (cbaId) {
        filters.cbaId = cbaId;
      }

      if (organizationId) {
        filters.organizationId = organizationId;
      }

      const sessionType = searchParams.get("sessionType");
      if (sessionType) {
        filters.sessionType = sessionType.split(",");
      }

      const confidentialityLevel = searchParams.get("confidentialityLevel");
      if (confidentialityLevel) {
        filters.confidentialityLevel = confidentialityLevel;
      }

      const dateFrom = searchParams.get("dateFrom");
      if (dateFrom) {
        filters.dateFrom = new Date(dateFrom);
      }

      const dateTo = searchParams.get("dateTo");
      if (dateTo) {
        filters.dateTo = new Date(dateTo);
      }

      const createdBy = searchParams.get("createdBy");
      if (createdBy) {
        filters.createdBy = createdBy;
      }

      const searchQuery = searchParams.get("searchQuery");
      if (searchQuery) {
        filters.searchQuery = searchQuery;
      }

      // Pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const sortBy = searchParams.get("sortBy") || "sessionDate";
      const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

      const result = await listBargainingNotes(filters, { page, limit, sortBy, sortOrder });

      return NextResponse.json(result);
    } catch (error) {
      console.error("Error listing bargaining notes:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request);
};

export const POST = async (request: NextRequest) => {
  return withRoleAuth(20, async (request, context) => {
    const { userId } = context;

  try {
      const body = await request.json();

      // Check if bulk create
      if (Array.isArray(body)) {
        // Validate all required fields
        for (const note of body) {
          if (!note.organizationId || !note.sessionDate || !note.sessionType || !note.title || !note.content) {
            return NextResponse.json(
              { error: "All notes must have organizationId, sessionDate, sessionType, title, and content" },
              { status: 400 }
            );
          }
        }

        // Add createdBy to all notes
        const notesWithUser = body.map(note => ({
          ...note,
          createdBy: userId,
          lastModifiedBy: userId
        }));

        const notes = await bulkCreateBargainingNotes(notesWithUser);
        return NextResponse.json({ notes, count: notes.length }, { status: 201 });
      }

      // Single note creation
      // Validate required fields
      if (!body.organizationId) {
        return NextResponse.json(
          { error: "organizationId is required" },
          { status: 400 }
        );
      }

      if (!body.sessionDate) {
        return NextResponse.json(
          { error: "sessionDate is required" },
          { status: 400 }
        );
      }

      if (!body.sessionType) {
        return NextResponse.json(
          { error: "sessionType is required" },
          { status: 400 }
        );
      }

      if (!body.title) {
        return NextResponse.json(
          { error: "title is required" },
          { status: 400 }
        );
      }

      if (!body.content) {
        return NextResponse.json(
          { error: "content is required" },
          { status: 400 }
        );
      }

      // Create note
      const note = await createBargainingNote({
        ...body,
        createdBy: userId,
        lastModifiedBy: userId,
      });

      return NextResponse.json({ note }, { status: 201 });
    } catch (error) {
      console.error("Error creating bargaining note:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
    })(request);
};

