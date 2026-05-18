import { useNavigate } from 'react-router-dom';
import { Navbar, Badge, Button } from 'react-bootstrap';
import { useAuthStore } from '../../store/authStore';

/**
 * Top navigation bar.
 * Shows app brand (logo), subtitle, and current phase indicator.
 *
 * The logo is served from public/smartload-logo.png — Vite makes
 * everything in /public available at the site root.
 */
export default function TopNavbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <Navbar className="smartload-topnav d-flex align-items-center">
      <Navbar.Brand className="d-flex align-items-center mb-0">
        <span>SmartLoad</span>
      </Navbar.Brand>
      <span className="text-white-50 small ms-3 aviation-mono d-none d-md-inline">
        B777F Cargo Loading Planning System
      </span>
      <div className="ms-auto d-flex align-items-center gap-2">
        {user?.email && (
          <span className="small text-white-50 d-none d-md-inline">
            {user.email}
          </span>
        )}
        <Badge bg="warning" text="dark" className="text-uppercase">
          Phase 0 — Dev Build
        </Badge>
        <Button variant="outline-light" size="sm" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </Navbar>
  );
}
