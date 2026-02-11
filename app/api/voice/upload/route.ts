import { logApiAuditEvent } from "@/lib/middleware/api-security";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { withEnhancedRoleAuth } from '@/lib/api-auth-guard';
import { 
  standardErrorResponse, 
  ErrorCode 
} from '@/lib/api/standardized-responses';

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


const voiceUploadSchema = z.object({
  path: z.string().min(1, 'path is required'),
});

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
        return standardErrorResponse(
          ErrorCode.MISSING_REQUIRED_FIELD,
          'No audio file provided'
        );
      }

      // Validate file size (max 25MB)
      const maxSize = 25 * 1024 * 1024;
      if (audioFile.size > maxSize) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Audio file too large. Maximum size: 25MB'
        );
      }
      
      // Validate file type
      const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
      if (!allowedTypes.includes(audioFile.type)) {
        return standardErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          `Invalid audio file type. Allowed types: ${allowedTypes.join(', ')}`
        );
      }
      
      // Validate claimId if provided
      if (claimId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(claimId)) {
          return standardErrorResponse(
            ErrorCode.VALIDATION_ERROR,
            'Invalid claim ID format'
          );
        }
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
    // Validate request body
    const validation = voiceUploadSchema.safeParse(body);
    if (!validation.success) {
      return standardErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        validation.error.errors
      );
    }
    
    const { path } = validation.data;

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

