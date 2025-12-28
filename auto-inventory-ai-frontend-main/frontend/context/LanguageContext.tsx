import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from '../utils/translations';

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Try to get language from localStorage, default to 'en'
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('app_language');
        return (saved === 'en' || saved === 'hi') ? saved : 'en';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app_language', lang);
    };

    const t = (key: string): string => {
        const keys = key.split('.');
        let value: any = translations[language];

        // Simple deep access logic if needed, though our structure is currently flat/shallow
        // But since our structure is flat grouping (e.g. 'nav.dashboard'), we can just direct access
        // if we defined keys as strings.
        // However, the current translations object has flat keys like 'nav.dashboard'. 
        // So direct access is enough.

        // Fallback to key if translation missing
        return value[key as keyof typeof value] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
