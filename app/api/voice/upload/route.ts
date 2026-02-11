import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';

// Lazy initialization to avoid module-level env var access during build
let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseClient;
}

export const runtime = "nodejs";
export const maxDuration = 30;

export const POST = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Authenticate user
      // Parse form data
      const formData = await request.formData();
      const audioFile = formData.get("audio") as File;
      const claimId = formData.get("claimId") as string;

      if (!audioFile) {
        return NextResponse.json(
          { error: "No audio file provided" },
          { status: 400 }
        );
      }

      // Validate file size (max 25MB)
      const maxSize = 25 * 1024 * 1024;
      if (audioFile.size > maxSize) {
        return NextResponse.json(
          { error: "Audio file too large. Maximum size: 25MB" },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const extension = audioFile.name.split('.').pop() || 'webm';
      const filename = claimId 
        ? `claims/${claimId}/voice_${timestamp}.${extension}`
        : `temp/${userId}_${timestamp}.${extension}`;

      // Convert file to buffer
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage
      const { data, error } = await getSupabaseClient().storage
        .from('voice-recordings')
        .upload(filename, buffer, {
          contentType: audioFile.type,
          upsert: false,
        });

      if (error) {
return NextResponse.json(
          { error: "Failed to upload audio file", details: error.message },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = getSupabaseClient().storage
        .from('voice-recordings')
        .getPublicUrl(filename);

      return NextResponse.json({
        path: data.path,
        url: urlData.publicUrl,
        size: audioFile.size,
        success: true,
      });

    } catch (error) {
return NextResponse.json(
        { 
          error: "Failed to upload audio",
          details: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
      );
    }
    })(request);
};

export const DELETE = async (request: NextRequest) => {
  return withEnhancedRoleAuth(20, async (request, context) => {
    const { userId, organizationId } = context;

  try {
      // Authenticate user
      const { path } = await request.json();

      if (!path) {
        return NextResponse.json(
          { error: "No file path provided" },
          { status: 400 }
        );
      }

      // Delete from Supabase Storage
      const { error } = await getSupabaseClient().storage
        .from('voice-recordings')
        .remove([path]);

      if (error) {
return NextResponse.json(
          { error: "Failed to delete audio file", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
      });

    } catch (error) {
return NextResponse.json(
        { 
          error: "Failed to delete audio",
          details: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
      );
    }
    })(request);
};

