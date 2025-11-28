import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, License } from '../lib/types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    license: License | null;
    loading: boolean;
    signUp: (email: string, password: string, data?: any) => Promise<any>;
    signIn: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    license: null,
    loading: true,
    signUp: async () => { },
    signIn: async () => { },
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [license, setLicense] = useState<License | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfileAndLicense(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                fetchProfileAndLicense(session.user.id);
            } else {
                setProfile(null);
                setLicense(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfileAndLicense = async (userId: string) => {
        try {
            // Fetch profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileData) setProfile(profileData as Profile);

            // Fetch license
            const { data: licenseData } = await supabase
                .from('licenses')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (licenseData) setLicense(licenseData as License);

        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email: string, password: string, data?: any) => {
        return supabase.auth.signUp({
            email,
            password,
            options: {
                data: data
            }
        });
    };

    const signIn = async (email: string, password: string) => {
        return supabase.auth.signInWithPassword({
            email,
            password
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setLicense(null);
    };

    const refreshProfile = async () => {
        if (user) await fetchProfileAndLicense(user.id);
    };

    return (
        <AuthContext.Provider value={{
            session,
            user,
            profile,
            license,
            loading,
            signUp,
            signIn,
            signOut,
            refreshProfile
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
