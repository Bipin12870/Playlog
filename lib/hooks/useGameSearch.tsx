import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type SearchScope = 'games' | 'favourites' | 'friends';

type ScopeState = {
  term: string;
  submittedTerm: string;
  submissionId: number;
};

type GameSearchContextValue = {
  scope: SearchScope;
  setScope: (scope: SearchScope) => void;
  term: string;
  setTerm: (value: string) => void;
  submittedTerm: string;
  submissionId: number;
  submit: (value?: string) => void;
  resetSearch: () => void;
};

const DEFAULT_SCOPE_STATE: ScopeState = {
  term: '',
  submittedTerm: '',
  submissionId: 0,
};

const INITIAL_STATE: Record<SearchScope, ScopeState> = {
  games: { ...DEFAULT_SCOPE_STATE },
  favourites: { ...DEFAULT_SCOPE_STATE },
  friends: { ...DEFAULT_SCOPE_STATE },
};

const GameSearchContext = createContext<GameSearchContextValue | undefined>(undefined);

export function GameSearchProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<SearchScope>('games');
  const [scopes, setScopes] = useState<Record<SearchScope, ScopeState>>(INITIAL_STATE);

  const setTerm = useCallback((value: string) => {
    setScopes((prev) => {
      const current = prev[scope];
      return {
        ...prev,
        [scope]: {
          ...current,
          term: value,
        },
      };
    });
  }, [scope]);

  const submit = useCallback(
    (value?: string) => {
      setScopes((prev) => {
        const current = prev[scope];
        const nextValue = value?.trim() ?? current.term.trim();
        if (!nextValue) {
          return {
            ...prev,
            [scope]: {
              term: '',
              submittedTerm: '',
              submissionId: current.submissionId + 1,
            },
          };
        }
        return {
          ...prev,
          [scope]: {
            term: nextValue,
            submittedTerm: nextValue,
            submissionId: current.submissionId + 1,
          },
        };
      });
    },
    [scope],
  );

  const resetSearch = useCallback(() => {
    setScopes((prev) => {
      const current = prev[scope];
      return {
        ...prev,
        [scope]: {
          term: '',
          submittedTerm: '',
          submissionId: current.submissionId + 1,
        },
      };
    });
  }, [scope]);

  const value = useMemo(() => {
    const current = scopes[scope];
    return {
      scope,
      setScope,
      term: current.term,
      setTerm,
      submittedTerm: current.submittedTerm,
      submissionId: current.submissionId,
      submit,
      resetSearch,
    };
  }, [scope, scopes, setTerm, submit, resetSearch]);

  return <GameSearchContext.Provider value={value}>{children}</GameSearchContext.Provider>;
}

export function useGameSearch() {
  const ctx = useContext(GameSearchContext);
  if (!ctx) {
    throw new Error('useGameSearch must be used within a GameSearchProvider');
  }
  return ctx;
}
