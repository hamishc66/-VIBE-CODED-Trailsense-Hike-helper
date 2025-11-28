
import React, { useState, useEffect } from 'react';
import { IconMountain, IconMoon, IconSun } from './Icons';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check system pref or stored pref
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDark = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 flex flex-col transition-colors duration-300">
      <header className="bg-white dark:bg-stone-800 border-b border-forest-100 dark:border-stone-700 sticky top-0 z-30 shadow-sm transition-colors">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-forest-600 dark:text-forest-400">
                <IconMountain className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-forest-800 dark:text-forest-200">TrailSense</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <span className="text-xs font-medium bg-forest-100 dark:bg-forest-900/50 text-forest-700 dark:text-forest-300 px-2 py-1 rounded-full">
              AI Powered
            </span>
            <button 
              onClick={toggleDark}
              className="p-2 rounded-full text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="py-6 text-center text-stone-400 text-sm">
        <p>&copy; {new Date().getFullYear()} TrailSense. Hike safe.</p>
      </footer>
    </div>
  );
};

export default Layout;