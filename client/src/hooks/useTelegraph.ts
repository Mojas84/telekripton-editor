import { useState, useEffect } from 'react';
import {
  createAccount,
  publishPage,
  editPage,
  markdownToTelegraphContent,
  TelegraphAccount,
  TelegraphPage,
} from '@/lib/telegraph';

const STORAGE_KEY = 'telegraph_account';

export interface UseTelegraphState {
  account: TelegraphAccount | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface UseTelegraphActions {
  initializeAccount: (shortName: string, authorName?: string) => Promise<void>;
  publishArticle: (title: string, content: string, authorName?: string) => Promise<TelegraphPage | null>;
  editArticle: (path: string, title: string, content: string, authorName?: string) => Promise<TelegraphPage | null>;
  logout: () => void;
}

export type UseTelegraphReturn = UseTelegraphState & UseTelegraphActions;

/**
 * Hook pro správu Telegraph účtu a publikování
 * Automaticky načítá uložený účet z localStorage
 */
export function useTelegraph(): UseTelegraphReturn {
  const [account, setAccount] = useState<TelegraphAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Načti uložený účet z localStorage
  useEffect(() => {
    const savedAccount = localStorage.getItem(STORAGE_KEY);
    if (savedAccount) {
      try {
        const parsed = JSON.parse(savedAccount);
        setAccount(parsed);
      } catch (e) {
        console.error('Chyba při parsování uloženého účtu:', e);
      }
    }
    setIsInitialized(true);
  }, []);

  const initializeAccount = async (
    shortName: string,
    authorName?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await createAccount(shortName, authorName || 'Anonym');

      if (!response.ok || !response.result) {
        throw new Error(response.error || 'Chyba při vytváření účtu');
      }

      setAccount(response.result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.result));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Neznámá chyba';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const publishArticle = async (
    title: string,
    content: string,
    authorName?: string
  ): Promise<TelegraphPage | null> => {
    if (!account?.access_token) {
      setError('Žádný Telegraph účet. Prosím vytvořte nejdřív účet.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const telegraphContent = markdownToTelegraphContent(content);

      const response = await publishPage(
        account.access_token,
        title,
        telegraphContent,
        authorName || account.author_name,
        account.author_url
      );

      if (!response.ok || !response.result) {
        throw new Error(response.error || 'Chyba při publikování');
      }

      return response.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Neznámá chyba';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const editArticle = async (
    path: string,
    title: string,
    content: string,
    authorName?: string
  ): Promise<TelegraphPage | null> => {
    if (!account?.access_token) {
      setError('Žádný Telegraph účet. Prosím vytvořte nejdřív účet.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const telegraphContent = markdownToTelegraphContent(content);

      const response = await editPage(
        account.access_token,
        path,
        title,
        telegraphContent,
        authorName || account.author_name,
        account.author_url
      );

      if (!response.ok || !response.result) {
        throw new Error(response.error || 'Chyba při editaci');
      }

      return response.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Neznámá chyba';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAccount(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    account,
    loading,
    error,
    isInitialized,
    initializeAccount,
    publishArticle,
    editArticle,
    logout,
  };
}
