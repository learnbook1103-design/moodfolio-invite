import { supabase } from './supabase';

// --- User Profile ---

export const getUserProfile = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            throw error;
        }

        if (data) {
            // [SAFEGUARD] Parse JSON fields if they are returned as strings
            const jsonFields = ['chat_answers', 'projects', 'skills', 'moods'];
            jsonFields.forEach(field => {
                if (data[field] && typeof data[field] === 'string') {
                    try {
                        data[field] = JSON.parse(data[field]);
                    } catch (e) {
                        console.warn(`Failed to parse ${field} in getUserProfile:`, e);
                    }
                }
            });
        }

        return data; // Returns null if not found
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
};

export const updateUserProfile = async (userId, profileData) => {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .upsert({
                id: userId,
                ...profileData,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) throw error;
        return data?.[0];
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
};

// --- Portfolios ---

export const getPortfolios = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('portfolios')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching portfolios:', error);
        return [];
    }
};

export const getPublicPortfolio = async (portfolioId) => {
    try {
        const { data, error } = await supabase
            .from('portfolios')
            .select('*')
            .eq('id', portfolioId)
            .single();

        if (error) throw error;
        return data; // Returns portfolio object or null
    } catch (error) {
        console.error('Error fetching public portfolio:', error);
        return null; // Return null on error for safe handling
    }
};

export const createPortfolio = async (userId, portfolioData) => {
    try {
        const { data, error } = await supabase
            .from('portfolios')
            .insert({
                user_id: userId,
                ...portfolioData
            })
            .select();

        if (error) throw error;
        return data?.[0];
    } catch (error) {
        console.error('Error creating portfolio:', error);
        throw error;
    }
};

export const updatePortfolio = async (portfolioId, updates) => {
    try {
        const { data, error } = await supabase
            .from('portfolios')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', portfolioId)
            .select();

        if (error) throw error;
        return data?.[0];
    } catch (error) {
        console.error('Error updating portfolio:', error);
        throw error;
    }
};

export const deletePortfolio = async (portfolioId) => {
    try {
        const { error } = await supabase
            .from('portfolios')
            .delete()
            .eq('id', portfolioId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting portfolio:', error);
        throw error;
    }
};

// --- Featured Projects ---

export const updatePortfolioFeaturedProjects = async (portfolioId, projectIds) => {
    try {
        // Validate: max 6 projects
        if (projectIds.length > 6) {
            throw new Error('Maximum 6 featured projects allowed');
        }

        const { data, error } = await supabase
            .from('portfolios')
            .update({
                featured_project_ids: projectIds,
                updated_at: new Date().toISOString()
            })
            .eq('id', portfolioId)
            .select();

        if (error) throw error;
        return data?.[0];
    } catch (error) {
        console.error('Error updating featured projects:', error);
        throw error;
    }
};
