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
  background: '#0b1021',
  surface: '#0f172a',
  surfaceSecondary: '#0c1426',
  border: '#1e2b44',
  text: '#e7edf8',
  muted: '#9eb1d4',
  subtle: '#b9c7e3',
  accent: '#0ea5e9',
  accentSoft: '#0b4f75',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  inputBackground: '#111a2c',
};

const lightColors: ThemeColors = {
  background: '#eef2f7',
  surface: '#ffffff',
  surfaceSecondary: '#e8edf5',
  border: '#d6deea',
  text: '#0f172a',
  muted: '#4c5e7a',
  subtle: '#6c7ba4',
  accent: '#0284c7',
  accentSoft: '#dbeafe',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  inputBackground: '#ffffff',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
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
