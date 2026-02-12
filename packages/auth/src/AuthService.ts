// Auth service interface and implementation
// This is a placeholder for integrating Auth0, Clerk, or custom auth

export interface User {
  id: string;
  email: string;
  name?: string;
  roles: string[];
  firmId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthService {
  getCurrentUser(token: string): Promise<User | null>;
  login(email: string, password: string): Promise<{ token: string } | null>;
  logout(token: string): Promise<void>;
  register(user: Partial<User>, password: string): Promise<User>;
  assignRole(userId: string, role: string): Promise<void>;
  removeRole(userId: string, role: string): Promise<void>;
  // Add more as needed
}

// Supabase Auth implementation
import { getSupabaseClient } from '@unioneyes/supabase';

const supabase = getSupabaseClient();

export class SupabaseAuthService implements AuthService {
  async getCurrentUser(token: string): Promise<User | null> {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    const { id, email, user_metadata, created_at } = data.user;
    return {
      id,
      email: email || '',
      name: user_metadata?.name || '',
      roles: user_metadata?.roles || ['user'],
      firmId: user_metadata?.firmId,
      createdAt: created_at,
      updatedAt: created_at,
    };
  }
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return null;
    return { token: data.session.access_token };
  }
  async logout(token: string) {
    await supabase.auth.signOut();
  }
  async register(user: Partial<User>, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email: user.email!,
      password,
      options: { data: { name: user.name, roles: user.roles || ['user'], firmId: user.firmId } }
    });
    if (error || !data.user) throw new Error(error?.message || 'Registration failed');
    const { id, email, user_metadata, created_at } = data.user;
    return {
      id,
      email: email || '',
      name: user_metadata?.name || '',
      roles: user_metadata?.roles || ['user'],
      firmId: user_metadata?.firmId,
      createdAt: created_at,
      updatedAt: created_at,
    };
  }
  async assignRole(userId: string, role: string) {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !userData.user) {
        throw new Error(`User not found: ${userError?.message}`);
      }

      // Get current roles from metadata
      const currentRoles = userData.user.user_metadata?.roles || ['user'];
      
      // Add role if not already present
      if (!currentRoles.includes(role)) {
        const updatedRoles = [...currentRoles, role];
        
        // Update user metadata
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userData.user.user_metadata,
            roles: updatedRoles
          }
        });
        
        if (updateError) {
          throw new Error(`Failed to assign role: ${updateError.message}`);
        }
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      throw error;
    }
  }

  async removeRole(userId: string, role: string) {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !userData.user) {
        throw new Error(`User not found: ${userError?.message}`);
      }

      // Get current roles from metadata
      const currentRoles = userData.user.user_metadata?.roles || ['user'];
      
      // Remove role if present
      const updatedRoles = currentRoles.filter((r: string) => r !== role);
      
      // Ensure at least 'user' role remains
      if (updatedRoles.length === 0) {
        updatedRoles.push('user');
      }
      
      // Update user metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...userData.user.user_metadata,
          roles: updatedRoles
        }
      });
      
      if (updateError) {
        throw new Error(`Failed to remove role: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Error removing role:', error);
      throw error;
    }
  }
}
