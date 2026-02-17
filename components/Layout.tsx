
import React from 'react';
import { Home, Map, Receipt, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/tracker', icon: Map, label: 'Track' },
    { path: '/finance', icon: Receipt, label: 'Money' },
    { path: '/reports', icon: BarChart3, label: 'Stats' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <h1 className="text-xl font-bold text-green-600 tracking-tight">Carl App</h1>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">GHANA</span>
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-500">C</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center px-2 py-3 safe-bottom z-20">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex flex-col items-center space-y-1 transition-colors ${isActive ? 'text-green-600' : 'text-slate-400'}`}
            >
              <item.icon size={24} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
