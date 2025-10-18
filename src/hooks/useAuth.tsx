import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'customer' | 'worker' | 'manager' | 'admin' | 'super_admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  loading: boolean;
  hasRole: (role: UserRole) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetching to prevent deadlock
          setTimeout(() => {
            console.log('Fetching roles for user:', session.user.id);
            supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .then(({ data: userRoles, error }) => {
                console.log('Roles fetched:', userRoles, 'Error:', error);
                setRoles(userRoles?.map(r => r.role) || []);
                setLoading(false);
              });
          }, 0);
        } else {
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('Initial session - Fetching roles for user:', session.user.id);
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .then(({ data: userRoles, error }) => {
            console.log('Initial roles fetched:', userRoles, 'Error:', error);
            setRoles(userRoles?.map(r => r.role) || []);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    // Listen for user deletion broadcasts with stable subscription
    const channel = supabase.channel('user-deletions');
    channel
      .on('broadcast', { event: 'user-deleted' }, async (payload) => {
        const deletedUserId = payload.payload?.userId;
        
        // Get fresh session data to avoid race conditions
        const { data: currentSession } = await supabase.auth.getSession();
        
        if (deletedUserId && deletedUserId === currentSession.session?.user?.id) {
          console.log('User deleted by admin, logging out...');
          await supabase.auth.signOut();
          window.location.href = '/auth';
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      channel.unsubscribe();
    };
  }, []);

  const hasRole = (role: UserRole) => roles.includes(role);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, hasRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
