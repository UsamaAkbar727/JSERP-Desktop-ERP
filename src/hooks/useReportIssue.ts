import { useState, useCallback } from 'react';

export interface UseReportIssueReturn {
  isOpen: boolean;
  errorId?: string;
  open: (errorId?: string) => void;
  close: () => void;
}

/**
 * Hook to manage the Report Issue modal state
 */
export function useReportIssue(): UseReportIssueReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [errorId, setErrorId] = useState<string>();

  const open = useCallback((errId?: string) => {
    setErrorId(errId);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setErrorId(undefined);
  }, []);

  return {
    isOpen,
    errorId,
    open,
    close,
  };
}

/**
 * Logger utility for sending logs from renderer process
 */
export const rendererLogger = {
  debug: (message: string, data?: any) => {
    if ((window.electron as any)?.logMessage) {
      (window.electron as any).logMessage('debug', message, data);
    } else {
          }
  },

  info: (message: string, data?: any) => {
    if ((window.electron as any)?.logMessage) {
      (window.electron as any).logMessage('info', message, data);
    } else {
          }
  },

  warn: (message: string, data?: any) => {
    if ((window.electron as any)?.logMessage) {
      (window.electron as any).logMessage('warn', message, data);
    } else {
          }
  },

  error: (message: string, data?: any) => {
    if ((window.electron as any)?.logMessage) {
      (window.electron as any).logMessage('error', message, data);
    } else {
      console.error(message, data);
    }
  },
};
