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
    login(email: string, password: string): Promise<{
        token: string;
    } | null>;
    logout(token: string): Promise<void>;
    register(user: Partial<User>, password: string): Promise<User>;
    assignRole(userId: string, role: string): Promise<void>;
    removeRole(userId: string, role: string): Promise<void>;
}
export declare class SupabaseAuthService implements AuthService {
    getCurrentUser(token: string): Promise<User | null>;
    login(email: string, password: string): Promise<{
        token: string;
    } | null>;
    logout(token: string): Promise<void>;
    register(user: Partial<User>, password: string): Promise<{
        id: string;
        email: string;
        name: any;
        roles: any;
        firmId: any;
        createdAt: string;
        updatedAt: string;
    }>;
    assignRole(userId: string, role: string): Promise<void>;
    removeRole(userId: string, role: string): Promise<void>;
}
//# sourceMappingURL=AuthService.d.ts.map