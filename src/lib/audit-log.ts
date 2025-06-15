
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export const logAction = async (action: string, details?: Json) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("Audit log: No user found.");
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('bank_id')
            .eq('id', user.id)
            .single();

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: user.id,
                user_email: user.email,
                action,
                details: details ? details : undefined,
                bank_id: profile?.bank_id || null,
            });

        if (error) {
            console.error("Error logging action:", error);
        }
    } catch (error) {
        console.error("Failed to log action:", error);
    }
};
