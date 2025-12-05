/**
 * Auth compatibility layer
 * Temporary stub to allow jurisdiction-rules API to compile
 * TODO: Implement proper Clerk authentication integration
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export const authOptions = {
  // Placeholder for next-auth compatibility
  // This will be replaced with proper Clerk integration
};

/**
 * Get server session (Clerk-compatible wrapper)
 * Returns a next-auth-like session object from Clerk
 */
export async function getServerSession(options?: typeof authOptions) {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  // Return a session object compatible with next-auth structure
  return {
    user: {
      id: userId,
      // Add other user properties as needed from Clerk
    }
  };
}

/**
 * Get user from request
 * Extracts user information from Clerk auth session
 */
export async function getUserFromRequest(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  
  return {
    id: userId,
    email: user?.emailAddresses?.[0]?.emailAddress,
    name: user?.fullName,
    ...user?.publicMetadata,
  };
}
