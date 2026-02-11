/**
 * API Documentation Page
 * 
 * Interactive API documentation using Swagger UI
 * Accessible at /api/docs
 */

'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading API Documentation...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI 
        url="/api/docs/openapi.json"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        defaultModelExpandDepth={1}
      />
    </div>
  );
}

