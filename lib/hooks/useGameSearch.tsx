import { ReactNode, createContext, useContext, useMemo, useState } from 'react';

type GameSearchContextValue = {
  term: string;
  setTerm: (value: string) => void;
  submittedTerm: string;
  submissionId: number;
  submit: (value?: string) => void;
};

const GameSearchContext = createContext<GameSearchContextValue | undefined>(undefined);

export function GameSearchProvider({ children }: { children: ReactNode }) {
  const [term, setTerm] = useState('');
  const [submittedTerm, setSubmittedTerm] = useState('');
  const [submissionId, setSubmissionId] = useState(0);

  const submit = (value?: string) => {
    const next = value?.trim() ?? term.trim();
    if (!next) {
      setSubmissionId((id) => id + 1);
      setSubmittedTerm('');
      setTerm('');
      return;
    }
    setTerm(next);
    setSubmittedTerm(next);
    setSubmissionId((id) => id + 1);
  };

  const value = useMemo(
    () => ({
      term,
      setTerm,
      submittedTerm,
      submissionId,
      submit,
    }),
    [term, submittedTerm, submissionId]
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
