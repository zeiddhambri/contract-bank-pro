
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: Tables<'profiles'> | null;
  bank: Tables<'banks'> | null;
  userRole: Tables<'profiles'>['role'] | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<Tables<'profiles'> | null>(null);
  const [bank, setBank] = useState<Tables<'banks'> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const isAdmin = userProfile?.role === 'super_admin';
  const userRole = userProfile?.role ?? null;

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, banks(*)')
          .eq('id', currentUser.id)
          .single();
        
        if (profile) {
          const { banks: bankData, ...userProfileData } = profile as any;
          setUserProfile(userProfileData);
          setBank(bankData);
        } else {
          setUserProfile(null);
          setBank(null);
        }
      } else {
        setUserProfile(null);
        setBank(null);
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (event === 'SIGNED_IN' && currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*, banks(*)')
            .eq('id', currentUser.id)
            .single();
          
          if (profile) {
            const { banks: bankData, ...userProfileData } = profile as any;
            setUserProfile(userProfileData);
            setBank(bankData);
          } else {
            setUserProfile(null);
            setBank(null);
          }
        } else if (event === 'SIGNED_OUT') {
          setUserProfile(null);
          setBank(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const isAdminUser = email === 'zeid.dhambri@gmail.com';
      toast({
        title: "Connexion réussie",
        description: isAdminUser ? "Bienvenue Administrateur !" : "Vous êtes maintenant connecté",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Inscription réussie",
        description: "Vérifiez votre email pour confirmer votre compte",
      });
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUserProfile(null);
      setBank(null);
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email envoyé",
        description: "Vérifiez votre email pour réinitialiser votre mot de passe",
      });
    }

    return { error };
  };

  const value = {
    user,
    session,
    userProfile,
    bank,
    userRole,
    signIn,
    signUp,
    signOut,
    resetPassword,
    loading,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
