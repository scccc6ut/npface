import { createContext, useContext } from 'react';

/** Page theme, driven by the header toggle; faces follow it via `theme` so dark mode uses the dark palette. */
export const ThemeCtx = createContext<'light' | 'dark'>('light');
export const usePageTheme = () => useContext(ThemeCtx);
