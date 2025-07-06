import React from 'react';
import { ThemeContext, useThemeStorage } from '../hooks/useTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const themeProps = useThemeStorage();

  return <ThemeContext.Provider value={themeProps}>{children}</ThemeContext.Provider>;
};
