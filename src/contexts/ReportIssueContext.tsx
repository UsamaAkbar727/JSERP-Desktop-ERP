import React, { createContext, useState, useCallback } from 'react';

export interface ReportIssueContextType {
  isOpen: boolean;
  errorId?: string;
  openReport: (errorId?: string) => void;
  closeReport: () => void;
}

export const ReportIssueContext = createContext<ReportIssueContextType | undefined>(undefined);

export interface ReportIssueProviderProps {
  children: React.ReactNode;
}

export function ReportIssueProvider({ children }: ReportIssueProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorId, setErrorId] = useState<string>();

  const openReport = useCallback((errId?: string) => {
    setErrorId(errId);
    setIsOpen(true);
  }, []);

  const closeReport = useCallback(() => {
    setIsOpen(false);
    setErrorId(undefined);
  }, []);

  return (
    <ReportIssueContext.Provider
      value={{
        isOpen,
        errorId,
        openReport,
        closeReport,
      }}
    >
      {children}
    </ReportIssueContext.Provider>
  );
}

export function useReportIssueContext(): ReportIssueContextType {
  const context = React.useContext(ReportIssueContext);
  if (!context) {
    throw new Error('useReportIssueContext must be used within ReportIssueProvider');
  }
  return context;
}
