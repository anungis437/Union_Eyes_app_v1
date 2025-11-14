"use server";

import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema/users-schema";

/**
 * Get database user ID by email
 * Used to map Clerk users to database users
 */
export const getUserByEmail = async (email: string) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return user || null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
};

/**
 * Get database user ID by UUID
 */
export const getUserById = async (userId: string) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
    
    return user || null;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }
};
