import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

type GameSearchContextValue = {
  term: string;
  setTerm: (value: string) => void;
  submittedTerm: string;
  submissionId: number;
  submit: (value?: string) => void;
  resetSearch: () => void;
};

const GameSearchContext = createContext<GameSearchContextValue | undefined>(undefined);

export function GameSearchProvider({ children }: { children: ReactNode }) {
  const [term, setTerm] = useState('');
  const [submittedTerm, setSubmittedTerm] = useState('');
  const [submissionId, setSubmissionId] = useState(0);

  const resetSearch = useCallback(() => {
    setTerm('');
    setSubmittedTerm('');
    setSubmissionId((id) => id + 1);
  }, []);

  const submit = useCallback(
    (value?: string) => {
    const next = value?.trim() ?? term.trim();
    if (!next) {
      resetSearch();
      return;
    }
    setTerm(next);
    setSubmittedTerm(next);
    setSubmissionId((id) => id + 1);
    },
    [term, resetSearch]
  );

  const value = useMemo(
    () => ({
      term,
      setTerm,
      submittedTerm,
      submissionId,
      submit,
      resetSearch,
    }),
    [term, submittedTerm, submissionId, submit, resetSearch]
  );

  return <GameSearchContext.Provider value={value}>{children}</GameSearchContext.Provider>;
}

export function useGameSearch() {
  const ctx = useContext(GameSearchContext);
  if (!ctx) {
    throw new Error('useGameSearch must be used within a GameSearchProvider');
  }
  return ctx;
}
