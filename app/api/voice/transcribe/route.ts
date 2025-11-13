import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { transcribeAudioWithLanguage, type SupportedLanguage } from "@/lib/azure-speech";

export const runtime = "nodejs";
export const maxDuration = 60; // Maximum duration in seconds

/**
 * POST /api/voice/transcribe
 * Transcribes audio file to text using Azure Speech Services
 * 
 * Body: FormData with 'audio' file and optional 'language' parameter
 * Returns: { text: string, language: string, confidence?: number }
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
    const language = (formData.get("language") as SupportedLanguage) || "en-CA";

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["audio/wav", "audio/webm", "audio/ogg", "audio/mp3", "audio/mpeg"];
    if (!validTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Invalid audio type: ${audioFile.type}. Supported: WAV, WebM, OGG, MP3` },
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

    // Convert file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe audio
    const text = await transcribeAudioWithLanguage(buffer, language);

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No speech detected in audio" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      text: text.trim(),
      language,
      duration: audioFile.size, // Approximate
      success: true,
    });

  } catch (error) {
    console.error("Voice transcription error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
