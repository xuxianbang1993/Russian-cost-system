/**
 * 认证 Hook
 * 管理用户登录状态
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { profileRowToEntity } from '@/lib/supabase/adapters';
import type { User } from '@supabase/supabase-js';
import type { ProfileEntity } from '@/lib/calc/types';

interface AuthState {
  user: User | null;
  profile: ProfileEntity | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    const supabase = createClient();

    // 获取当前用户
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        const mappedProfile = profileRowToEntity(profile);

        setState({
          user,
          profile: mappedProfile,
          loading: false,
          isAdmin: mappedProfile?.role === 'admin',
        });
      } else {
        setState({ user: null, profile: null, loading: false, isAdmin: false });
      }
    });

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          const mappedProfile = profileRowToEntity(profile);

          setState({
            user: session.user,
            profile: mappedProfile,
            loading: false,
            isAdmin: mappedProfile?.role === 'admin',
          });
        } else {
          setState({ user: null, profile: null, loading: false, isAdmin: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
