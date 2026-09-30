import { create } from 'zustand';
import { apiClient, ApiError } from '@/lib/api-client';
import type { User } from '@frameforge/types';
import type { Locale } from '@/lib/i18n';
import { I18N_DICTIONARY } from '@/lib/i18n';

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'loading' | 'authenticated' | 'anonymous' | 'error';
  restoreSession: () => Promise<void>;
  locale: Locale;
  theme: 'dark' | 'light';
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  t: (key: keyof typeof I18N_DICTIONARY['zh-CN']) => string;
}

let sessionVersion = 0;
let restoration: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  status: 'loading',

  restoreSession: () => {
    if (restoration) return restoration;
    const version = sessionVersion;
    restoration = (async () => {
      try {
        const token = localStorage.getItem('frameforge_token');
        if (!token) {
          set({ user: null, token: null, status: 'anonymous' });
          return;
        }
        set({ user: null, token, status: 'loading' });
        const user = await apiClient<User>('/api/v1/auth/me', { token });
        if (sessionVersion === version) set({ user, token, status: 'authenticated' });
      } catch (error) {
        if (sessionVersion !== version) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          get().logout();
        } else {
          set({ user: null, status: 'error' });
        }
      }
    })().finally(() => { restoration = null; });
    return restoration;
  },
  locale: 'zh-CN',
  theme: 'dark',

  setAuth: (user, token) => {
    sessionVersion += 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem('frameforge_token', token);
    }
    set({ user, token, status: 'authenticated' });
  },

  logout: () => {
    sessionVersion += 1;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('frameforge_token');
    }
    set({ user: null, token: null, status: 'anonymous' });
  },

  setLocale: locale => {
    set({ locale });
  },

  setTheme: theme => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('light', theme === 'light');
    }
    set({ theme });
  },

  t: key => {
    const loc = get().locale;
    const dict = I18N_DICTIONARY[loc] || I18N_DICTIONARY['zh-CN'];
    return dict[key] || key;
  }
}));
