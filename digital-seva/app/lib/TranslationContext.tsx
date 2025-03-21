// /app/lib/TranslationContext.tsx
"use client";
import { createContext, useState, useContext, ReactNode } from "react";
import { translations } from "../translations/translations";

interface TranslationContextType {
  t: (key: string) => string;
  setLanguage: (language: string) => void;
  language: string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<string>("english");

  const t = (key: string) => {
    const keys = key.split(".");
    let translation = translations[language] as any;
    keys.forEach((k) => {
      translation = translation[k];
    });
    return translation || key;
  };

  return (
    <TranslationContext.Provider value={{ t, setLanguage, language }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};
