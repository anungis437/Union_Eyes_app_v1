"use server";

import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { withRLSContext } from "@/lib/rls-middleware";

/**
 * Get database user ID by email
 * Used to map Clerk users to database users
 */
export const getUserByEmail = async (
  email: string,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      const [user] = await dbOrTx
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

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

/**
 * Get database user ID by UUID
 */
export const getUserById = async (
  userId: string,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      const [user] = await dbOrTx
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

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};
