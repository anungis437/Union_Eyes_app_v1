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
    // Requires custom implementation (e.g., update user_metadata via admin API)
    throw new Error('Not implemented: assignRole');
  }
  async removeRole(userId: string, role: string) {
    // Requires custom implementation (e.g., update user_metadata via admin API)
    throw new Error('Not implemented: removeRole');
  }
}
