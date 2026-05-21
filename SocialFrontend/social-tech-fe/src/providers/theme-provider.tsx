'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');

    // Đồng bộ state với class trên thẻ HTML sau khi component mount
    useEffect(() => {
        const root = window.document.documentElement;
        const initialTheme = root.classList.contains('dark') ? 'dark' : 'light';
        setTheme(initialTheme);
    }, []);

    const toggleTheme = () => {
        const root = window.document.documentElement;
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        
        const changeTheme = () => {
            if (nextTheme === 'dark') {
                root.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                root.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            setTheme(nextTheme);
        };

        // Sử dụng View Transitions API nếu trình duyệt hỗ trợ
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
            (document as any).startViewTransition(changeTheme);
        } else {
            changeTheme();
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
