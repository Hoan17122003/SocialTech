'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { browserStorage } from '@/common/utils/browser-storage';

type Theme = 'light' | 'dark';

type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void;
};

type ViewTransitionDocument = Document & {
    startViewTransition?: (callback: () => void) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readInitialTheme(): Theme {
    if (typeof window === 'undefined') {
        return 'light';
    }

    return window.document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
    const root = window.document.documentElement;

    if (theme === 'dark') {
        root.classList.add('dark');
        browserStorage.set('theme', 'dark');
        return;
    }

    root.classList.remove('dark');
    browserStorage.set('theme', 'light');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(readInitialTheme);

    const toggleTheme = useCallback(() => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        const changeTheme = () => {
            applyTheme(nextTheme);
            setTheme(nextTheme);
        };
        const transitionDocument = document as ViewTransitionDocument;

        // View Transitions is optional polish; theme switching still works without browser support.
        if (transitionDocument.startViewTransition) {
            transitionDocument.startViewTransition(changeTheme);
            return;
        }

        changeTheme();
    }, [theme]);

    const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
}
