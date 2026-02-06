'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { translations, Language } from '@/locales';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Always start with default "rw" to match server-side rendering
  // This prevents hydration mismatches
  const [language, setLanguage] = useState<Language>('rw');

  // Track if component has mounted to prevent hydration mismatch
  const [_mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only read from localStorage after component mounts (client-side only)
    setMounted(true);
    const savedLang = localStorage.getItem('language') as Language | null;
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang);
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    // Always use current language - the suppressHydrationWarning on elements
    // will prevent hydration errors when language changes after mount
    const langPack = translations[language];
    return langPack[key] || key; // fallback to key if not found
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: changeLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
