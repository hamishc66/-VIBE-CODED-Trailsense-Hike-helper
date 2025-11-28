import React from 'react';
import { IconMountain } from './Icons';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      <header className="bg-white border-b border-forest-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-forest-600">
                <IconMountain className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-forest-800">TrailSense</h1>
          </div>
          <nav>
            <span className="text-xs font-medium bg-forest-100 text-forest-700 px-2 py-1 rounded-full">
              AI Powered
            </span>
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
