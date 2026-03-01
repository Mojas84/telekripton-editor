import { useEffect, useState } from 'react';
import {
  createAccount,
  createPage,
  getAccountInfo,
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
  initializeAccount: (shortName: string, authorName?: string, authorUrl?: string) => Promise<void>;
  publishArticle: (title: string, content: string, authorName?: string) => Promise<TelegraphPage | null>;
  logout: () => void;
}

export type UseTelegraphReturn = UseTelegraphState & UseTelegraphActions;

/**
 * Hook for managing Telegraph account and publishing
 * Automatically loads saved account from localStorage on mount
 */
export function useTelegraph(): UseTelegraphReturn {
  const [account, setAccount] = useState<TelegraphAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved account from localStorage on mount
  useEffect(() => {
    const savedAccount = localStorage.getItem(STORAGE_KEY);
    if (savedAccount) {
      try {
        const parsed = JSON.parse(savedAccount);
        setAccount(parsed);
      } catch (e) {
        console.error('Failed to parse saved account:', e);
      }
    }
    setIsInitialized(true);
  }, []);

  const initializeAccount = async (
    shortName: string,
    authorName?: string,
    authorUrl?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await createAccount(shortName, authorName, authorUrl);

      if (!response.ok || !response.result) {
        throw new Error(response.error || 'Failed to create account');
      }

      setAccount(response.result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.result));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
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
      setError('No Telegraph account. Please initialize first.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert markdown content to Telegraph format
      const telegraphContent = markdownToTelegraphContent(content);

      // Create page
      const response = await createPage(
        account.access_token,
        title,
        telegraphContent,
        authorName || account.author_name,
        account.author_url,
        true
      );

      if (!response.ok || !response.result) {
        throw new Error(response.error || 'Failed to publish article');
      }

      return response.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
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
    logout,
  };
}
