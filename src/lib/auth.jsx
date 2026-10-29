import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const loadProfile = useCallback(async uid => {
    if (!uid) { setProfile(null); return null; }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data); return data;
  }, []);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); loadProfile(data.session?.user?.id).finally(() => setReady(true)); });
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => {
      setSession(s);
      if (ev === 'PASSWORD_RECOVERY') setRecovery(true);
      if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT' || ev === 'USER_UPDATED') setTimeout(() => loadProfile(s?.user?.id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);
  const value = { session, user: session?.user ?? null, profile, ready, recovery, setRecovery, refreshProfile: () => loadProfile(session?.user?.id), signOut: () => supabase.auth.signOut() };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
