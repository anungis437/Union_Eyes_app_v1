import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/voice/upload
 * Uploads audio recording to Supabase Storage
 * 
 * Body: FormData with 'audio' file
 * Returns: { url: string, path: string, size: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
    const { data, error } = await supabase.storage
      .from('voice-recordings')
      .upload(filename, buffer, {
        contentType: audioFile.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: "Failed to upload audio file", details: error.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-recordings')
      .getPublicUrl(filename);

    return NextResponse.json({
      path: data.path,
      url: urlData.publicUrl,
      size: audioFile.size,
      success: true,
    });

  } catch (error) {
    console.error("Audio upload error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to upload audio",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/upload
 * Deletes audio recording from Supabase Storage
 * 
 * Body: { path: string }
 * Returns: { success: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { path } = await request.json();

    if (!path) {
      return NextResponse.json(
        { error: "No file path provided" },
        { status: 400 }
      );
    }

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from('voice-recordings')
      .remove([path]);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete audio file", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error("Audio delete error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to delete audio",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
