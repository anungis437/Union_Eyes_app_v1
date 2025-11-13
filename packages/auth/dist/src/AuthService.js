// Auth service interface and implementation
// This is a placeholder for integrating Auth0, Clerk, or custom auth
// Supabase Auth implementation
import { getSupabaseClient } from '@court-lens/supabase';
const supabase = getSupabaseClient();
export class SupabaseAuthService {
    async getCurrentUser(token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user)
            return null;
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
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.session)
            return null;
        return { token: data.session.access_token };
    }
    async logout(token) {
        await supabase.auth.signOut();
    }
    async register(user, password) {
        const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password,
            options: { data: { name: user.name, roles: user.roles || ['user'], firmId: user.firmId } }
        });
        if (error || !data.user)
            throw new Error(error?.message || 'Registration failed');
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
    async assignRole(userId, role) {
        // Requires custom implementation (e.g., update user_metadata via admin API)
        throw new Error('Not implemented: assignRole');
    }
    async removeRole(userId, role) {
        // Requires custom implementation (e.g., update user_metadata via admin API)
        throw new Error('Not implemented: removeRole');
    }
}
//# sourceMappingURL=AuthService.js.map