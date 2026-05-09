import { Outlet } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import Sidebar from './Sidebar';

/**
 * Main application shell — Topbar + Sidebar + Content slot.
 * All routed pages render inside <Outlet />.
 */
export default function AppLayout() {
  return (
    <div className="smartload-shell">
      <TopNavbar />
      <div className="smartload-body">
        <Sidebar />
        <main className="smartload-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
