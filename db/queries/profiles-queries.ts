"use server";

import { eq } from "drizzle-orm";
import { InsertProfile, profilesTable, SelectProfile } from "../schema/profiles-schema";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { withRLSContext } from "@/lib/rls-middleware";

export const createProfile = async (
  data: InsertProfile,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      // Calculate nextCreditRenewal date (4 weeks from now) if not provided
      const nextCreditRenewal = data.nextCreditRenewal || (() => {
        const date = new Date();
        date.setDate(date.getDate() + 28); // 4 weeks = 28 days
        return date;
      })();
      
      // Set default values only if they are not provided
      const profileData = {
        ...data,
        // Default to 5 credits for free users, but respect provided values
        usageCredits: data.usageCredits ?? (data.membership === "pro" ? 1000 : 5),
        // Default to 0 used credits if not specified
        usedCredits: data.usedCredits ?? 0,
        // Set next credit renewal if not specified
        nextCreditRenewal,
        // Default to free membership if not specified
        membership: data.membership || "free"
      };
      
      console.log(`Creating profile with data:`, {
        userId: profileData.userId,
        email: profileData.email,
        membership: profileData.membership,
        usageCredits: profileData.usageCredits,
        usedCredits: profileData.usedCredits,
        status: profileData.status || "active"
      });
      
      const [newProfile] = await dbOrTx.insert(profilesTable).values(profileData).returning();
      return newProfile;
    } catch (error) {
      console.error("Error creating profile:", error);
      throw new Error("Failed to create profile");
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

export const getProfileByUserId = async (
  userId: string,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      console.log(`Looking up profile by user ID: ${userId}`);
      
      // Increase timeout from 5 to 10 seconds for more reliability in serverless environments
      const profiles = await Promise.race([
        dbOrTx.select().from(profilesTable).where(eq(profilesTable.userId, userId)),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Database query timeout")), 10000)
        )
      ]) as SelectProfile[];
      
      if (profiles && profiles.length > 0) {
        return profiles[0];
      }
      return null;
    } catch (error) {
      console.error("Error getting profile by user ID:", error);
      return null;
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

export const getAllProfiles = async (
  tx?: NodePgDatabase<any>
): Promise<SelectProfile[]> => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    return dbOrTx.select().from(profilesTable);
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

export const updateProfile = async (
  userId: string,
  data: Partial<InsertProfile>,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      const [updatedProfile] = await dbOrTx.update(profilesTable).set(data).where(eq(profilesTable.userId, userId)).returning();
      return updatedProfile;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw new Error("Failed to update profile");
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

export const updateProfileByStripeCustomerId = async (
  stripeCustomerId: string,
  data: Partial<InsertProfile>,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      const [updatedProfile] = await dbOrTx.update(profilesTable).set(data).where(eq(profilesTable.stripeCustomerId, stripeCustomerId)).returning();
      return updatedProfile;
    } catch (error) {
      console.error("Error updating profile by stripe customer ID:", error);
      throw new Error("Failed to update profile");
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

export const deleteProfile = async (
  userId: string,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      await dbOrTx.delete(profilesTable).where(eq(profilesTable.userId, userId));
    } catch (error) {
      console.error("Error deleting profile:", error);
      throw new Error("Failed to delete profile");
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

//AVOID USING THIS FUNCTION AS WE WILL USE THE UPDATEPROFILE FUNCTION (USING THE CLERK ID) FIRST, THIS FUNCTION BELOW IS JUST A FALLBACK!

//AVOID USING THIS FUNCTION AS WE WILL USE THE UPDATEPROFILE FUNCTION (USING THE CLERK ID) FIRST, THIS FUNCTION BELOW IS JUST A FALLBACK!

export const updateProfileByWhopUserId = async (
  whopUserId: string,
  data: Partial<InsertProfile>,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      // Log the database operation for audit purposes
      console.log(`Updating profile by Whop user ID: ${whopUserId}, with data:`, data);
      
      if (!whopUserId) {
        throw new Error("Whop user ID is required");
      }
      
      // First check if the profile exists
      let existingProfile = null;
      let retries = 0;
      const maxRetries = 3;
      
      // Add retry logic for fetching profile
      while (retries < maxRetries && !existingProfile) {
        try {
          existingProfile = await getProfileByWhopUserId(whopUserId, dbOrTx);
          if (!existingProfile) {
            console.warn(`Attempt ${retries + 1}: No profile found with Whop user ID: ${whopUserId}`);
            retries++;
            if (retries < maxRetries) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
            }
          }
        } catch (error) {
          console.error(`Attempt ${retries + 1}: Error fetching profile:`, error);
          retries++;
          if (retries < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
          } else {
            throw error; // Rethrow after max retries
          }
        }
      }
      
      if (!existingProfile) {
        console.warn(`No profile found with Whop user ID: ${whopUserId} after ${maxRetries} attempts. Skipping update.`);
        return null;
      }
      
      // Then update the profile - critical part: use the Clerk user ID for the actual update
      const clerkUserId = existingProfile.userId;
      console.log(`Found profile with Clerk user ID: ${clerkUserId}, will use this for database update`);
      
      const [updatedProfile] = await dbOrTx.update(profilesTable)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(profilesTable.userId, clerkUserId))
        .returning();
      
      if (!updatedProfile) {
        console.warn(`Update operation completed but no profile was returned for Clerk user ID: ${clerkUserId}`);
        return null;
      } else {
        console.log(`Successfully updated profile for Clerk user ID: ${clerkUserId} via Whop user ID: ${whopUserId}`, updatedProfile);
      }
      
      return updatedProfile;
    } catch (error) {
      console.error("Error updating profile by Whop user ID:", error);
      throw new Error(`Failed to update profile by Whop user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
}

export const getProfileByWhopUserId = async (
  whopUserId: string,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      if (!whopUserId) {
        throw new Error("Whop user ID is required");
      }
      
      console.log(`Looking up profile by Whop user ID: ${whopUserId}`);
      
      // Add retry logic with timeout
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          // Use a more reasonable timeout (10 seconds)
          const profiles = await Promise.race([
            dbOrTx.select().from(profilesTable).where(eq(profilesTable.whopUserId, whopUserId)),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Database query timeout")), 10000)
            )
          ]) as SelectProfile[];
          
          const profile = profiles && profiles.length > 0 ? profiles[0] : null;
          
          if (!profile) {
            console.warn(`No profile found with Whop user ID: ${whopUserId}`);
          } else {
            console.log(`Found profile for Whop user ID: ${whopUserId}`, profile);
          }
          
          return profile;
        } catch (error) {
          console.error(`Attempt ${retries + 1}: Error getting profile by Whop user ID:`, error);
          retries++;
          
          if (retries < maxRetries) {
            // Wait before retrying (exponential backoff)
            const backoffMs = 1000 * Math.pow(2, retries);
            console.log(`Retrying in ${backoffMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          } else {
            throw error; // Rethrow after max retries
          }
        }
      }
      
      // This should never be reached due to the while loop logic
      return null;
    } catch (error) {
      console.error("Error getting profile by Whop user ID:", error);
      throw new Error(`Failed to get profile by Whop user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

// Enhanced function to get profile by email
export const getProfileByUserEmail = async (
  email: string,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    if (!email) {
      console.error("Email is required for profile lookup");
      return null;
    }

    try {
      // Log the operation
      console.log(`Looking up profile by user email: ${email}`);
      
      // Add a timeout to prevent hanging connections
      const profiles = await Promise.race([
        dbOrTx.select().from(profilesTable).where(eq(profilesTable.email, email)),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Database query timeout")), 5000)
        )
      ]) as SelectProfile[];
      
      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        console.log(`Found profile for email ${email}: userId=${profile.userId}`);
        return profile;
      } else {
        console.log(`No profile found with email: ${email}`);
        return null;
      }
    } catch (error) {
      console.error("Error looking up profile by email:", error);
      return null;
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

// For the frictionless payment flow - function with standardized name
export const getProfileByEmail = async (
  email: string,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      // Query profiles with matching email
      const profiles = await dbOrTx.select().from(profilesTable).where(eq(profilesTable.email, email));
      return profiles[0] || null;
    } catch (error) {
      console.error("Error getting profile by email:", error);
      return null;
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

// Add a utility function to get plan information
export const getUserPlanInfo = async (
  userId: string,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      console.log(`Getting plan information for user: ${userId}`);
      const profile = await getProfileByUserId(userId, dbOrTx);
      
      if (!profile) {
        console.warn(`No profile found for user: ${userId}`);
        return null;
      }
      
      return {
        membership: profile.membership,
        planDuration: profile.planDuration || null,
        status: profile.status || null,
        usageCredits: profile.usageCredits || null,
        usedCredits: profile.usedCredits || null,
        billingCycleStart: profile.billingCycleStart || null,
        billingCycleEnd: profile.billingCycleEnd || null,
        nextCreditRenewal: profile.nextCreditRenewal || null
      };
    } catch (error) {
      console.error("Error getting user plan information:", error);
      return null;
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

// Delete profile by ID (works with both regular and temporary IDs)
export const deleteProfileById = async (
  profileId: string,
  tx?: NodePgDatabase<any>
) => {
  const executeQuery = async (dbOrTx: NodePgDatabase<any>) => {
    try {
      console.log(`Deleting profile with ID: ${profileId}`);
      
      if (!profileId) {
        throw new Error("Profile ID is required");
      }
      
      await dbOrTx.delete(profilesTable).where(eq(profilesTable.userId, profileId));
      console.log(`Successfully deleted profile with ID: ${profileId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting profile with ID ${profileId}:`, error);
      return false;
    }
  };

  if (tx) {
    return executeQuery(tx);
  } else {
    return withRLSContext(async (tx) => executeQuery(tx));
  }
};

