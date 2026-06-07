import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import Sidebar from './Sidebar';

/**
 * Main application shell — Topbar + Sidebar + Content slot.
 * The sidebar is collapsible (icon-only rail); preference persisted in localStorage.
 * All routed pages render inside <Outlet />.
 */
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('smartload_sidebar_collapsed') === '1',
  );

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('smartload_sidebar_collapsed', next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className="smartload-shell">
      <TopNavbar />
      <div className="smartload-body">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        <main className="smartload-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
