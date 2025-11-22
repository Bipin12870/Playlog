import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

type ThemeScheme = 'light' | 'dark';
export type ThemePreference = ThemeScheme | 'system';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  text: string;
  muted: string;
  subtle: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  inputBackground: string;
};

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ThemeScheme;
  colors: ThemeColors;
  isDark: boolean;
  statusBarStyle: 'light-content' | 'dark-content';
  initialized: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const STORAGE_KEY = 'playlog:theme-preference';

const darkColors: ThemeColors = {
  background: '#0f172a',
  surface: '#111827',
  surfaceSecondary: '#0b1220',
  border: '#1e293b',
  text: '#f8fafc',
  muted: '#94a3b8',
  subtle: '#cbd5f5',
  accent: '#7c3aed',
  accentSoft: '#312e81',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  inputBackground: '#1f2937',
};

const lightColors: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceSecondary: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#475569',
  subtle: '#64748b',
  accent: '#2563eb',
  accentSoft: '#dbeafe',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  inputBackground: '#ffffff',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      } catch (error) {
        console.warn('Failed to load theme preference', error);
      } finally {
        setInitialized(true);
      }
    };
    void loadPreference();
  }, []);

  const resolved: ThemeScheme =
    preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      console.warn('Failed to save theme preference', error);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      colors: resolved === 'dark' ? darkColors : lightColors,
      isDark: resolved === 'dark',
      statusBarStyle: resolved === 'dark' ? 'light-content' : 'dark-content',
      initialized,
      setPreference,
    }),
    [preference, resolved, initialized, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
