/**
 * API Documentation Endpoint
 * 
 * Serves the generated OpenAPI specification for Swagger UI
 * 
 * GET /api/docs
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export async function GET() {
  try {
    const specPath = path.join(process.cwd(), 'docs/api/openapi-generated.yaml');
    
    if (!fs.existsSync(specPath)) {
      return NextResponse.json(
        { 
          error: 'OpenAPI specification not found',
          message: 'Run: pnpm run openapi:generate'
        },
        { status: 404 }
      );
    }
    
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const spec = yaml.load(specContent);
    
    return NextResponse.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Failed to load OpenAPI spec:', error);
    return NextResponse.json(
      { error: 'Failed to load API specification' },
      { status: 500 }
    );
  }
}
