import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { License } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

export const useLicense = () => {
    const { user } = useAuth();
    const [license, setLicense] = useState<License | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLicense = useCallback(async () => {
        if (!user) {
            setLicense(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('licenses')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) {
                throw error;
            }

            setLicense(data as License);
        } catch (err: any) {
            console.error('Error fetching license:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchLicense();
    }, [fetchLicense]);

    const getDaysRemaining = () => {
        if (!license || !license.data_expiracao) return 0;
        const now = new Date();
        const expiration = new Date(license.data_expiracao);
        const diffTime = expiration.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    return {
        license,
        loading,
        error,
        refreshLicense: fetchLicense,
        daysRemaining: getDaysRemaining()
    };
};
