/**
 * Better-Auth Client Wrapper
 * 
 * Provides auth and database functionality using Better-Auth
 * Replaces Supabase with direct API calls.
 */

import { authClient } from '$lib/auth-client';

export async function getAccessToken() {
    try {
        const session = await authClient.getSession();
        const token = session?.data?.session?.token;
        return token ? `Bearer ${token}` : null;
    } catch {
        return null;
    }
}

/**
 * Compatibility object that mimics supabase API but uses API endpoints
 * Database calls should go through dedicated API endpoints instead
 */
export const supabase = {
    auth: {
        getSession: async () => {
            try {
                const session = await authClient.getSession();
                return { data: { session: session?.data?.session } };
            } catch (error) {
                return { data: { session: null }, error };
            }
        },
        getUser: async (token: string) => {
            try {
                const session = await authClient.getSession();
                return { data: session?.data?.session?.user };
            } catch (error) {
                return { data: null, error };
            }
        },
        signOut: async () => {
            try {
                await authClient.signOut();
                return { error: null };
            } catch (error) {
                return { error };
            }
        }
    }
};
