import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from '../common/Footer';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div className="flex flex-1">
        {sidebarOpen && <Sidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};
