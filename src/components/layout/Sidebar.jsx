import { NavLink } from 'react-router-dom';
import { Nav } from 'react-bootstrap';
import { FaFileDownload } from 'react-icons/fa';

/**
 * Left navigation sidebar.
 * Active phase items are clickable; future-phase items are disabled placeholders.
 */
export default function Sidebar() {
  return (
    <aside className="smartload-sidebar">
      <SidebarSection label="Operations">
        <SidebarLink to="/" end icon="bi-house-door" label="Home" />
        <SidebarLink to="/viewer" icon="bi-airplane" label="B777F Viewer" />
      </SidebarSection>

      <SidebarSection label="Planning">
        <SidebarLink to="/cargo-importer" Icon={FaFileDownload} label="Cargo Importer" />
        <SidebarPlaceholder icon="bi-table" label="Manifest" phase="Phase 1" />
        <SidebarPlaceholder icon="bi-grid-3x3-gap" label="Load Plan" phase="Phase 3" />
        <SidebarPlaceholder icon="bi-speedometer2" label="CG Validation" phase="Phase 4" />
      </SidebarSection>

      <SidebarSection label="Reports">
        <SidebarPlaceholder icon="bi-file-earmark-pdf" label="LIR" phase="Phase 5" />
        <SidebarPlaceholder icon="bi-clipboard-data" label="Load Sheet" phase="Phase 5" />
      </SidebarSection>

      <SidebarSection label="Admin">
        <SidebarPlaceholder icon="bi-people" label="Users" phase="Phase 6" />
        <SidebarPlaceholder icon="bi-gear" label="Settings" phase="Phase 6" />
      </SidebarSection>
    </aside>
  );
}

function SidebarSection({ label, children }) {
  return (
    <div className="mb-3">
      <div className="text-uppercase small fw-bold text-secondary px-3 mb-1">
        {label}
      </div>
      <Nav className="flex-column">{children}</Nav>
    </div>
  );
}

function SidebarLink({ to, end, icon, Icon, label }) {
  return (
    <Nav.Link as={NavLink} to={to} end={end} className="d-flex align-items-center">
      {Icon ? (
        <Icon className="me-2 flex-shrink-0" aria-hidden size={18} />
      ) : (
        <i className={`bi ${icon} me-2`} aria-hidden />
      )}
      {label}
    </Nav.Link>
  );
}

function SidebarPlaceholder({ icon, label, phase }) {
  return (
    <Nav.Link disabled className="d-flex align-items-center">
      <i className={`bi ${icon} me-2`} />
      <span className="flex-grow-1">{label}</span>
      <span className="badge bg-secondary opacity-75">{phase}</span>
    </Nav.Link>
  );
}
