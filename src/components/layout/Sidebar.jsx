import { NavLink } from 'react-router-dom';
import { Nav } from 'react-bootstrap';
import { BsGrid3X3Gap } from 'react-icons/bs';
import {
  FaClipboardList,
  FaCog,
  FaFileDownload,
  FaFilePdf,
  FaHome,
  FaPlane,
  FaTable,
  FaTachometerAlt,
  FaUsers,
} from 'react-icons/fa';

/**
 * Left navigation sidebar.
 * Active phase items are clickable; future-phase items are disabled placeholders.
 */
export default function Sidebar() {
  return (
    <aside className="smartload-sidebar">
      <SidebarSection label="Operations">
        <SidebarLink to="/" end Icon={FaHome} label="Home" />
        <SidebarLink to="/viewer" Icon={FaPlane} label="B777F Viewer" />
      </SidebarSection>

      <SidebarSection label="Planning">
        <SidebarLink to="/cargo-importer" Icon={FaFileDownload} label="Cargo Importer" />
        <SidebarPlaceholder Icon={FaTable} label="Manifest" phase="Phase 1" />
        <SidebarPlaceholder Icon={BsGrid3X3Gap} label="Load Plan" phase="Phase 3" />
        <SidebarPlaceholder Icon={FaTachometerAlt} label="CG Validation" phase="Phase 4" />
      </SidebarSection>

      <SidebarSection label="Reports">
        <SidebarPlaceholder Icon={FaFilePdf} label="LIR" phase="Phase 5" />
        <SidebarPlaceholder Icon={FaClipboardList} label="Load Sheet" phase="Phase 5" />
      </SidebarSection>

      <SidebarSection label="Admin">
        <SidebarPlaceholder Icon={FaUsers} label="Users" phase="Phase 6" />
        <SidebarPlaceholder Icon={FaCog} label="Settings" phase="Phase 6" />
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

function SidebarLink({ to, end, Icon, label }) {
  return (
    <Nav.Link as={NavLink} to={to} end={end} className="d-flex align-items-center">
      <Icon className="me-2 flex-shrink-0" aria-hidden size={18} />
      {label}
    </Nav.Link>
  );
}

function SidebarPlaceholder({ Icon, label, phase }) {
  return (
    <Nav.Link disabled className="d-flex align-items-center">
      <Icon className="me-2 flex-shrink-0 text-secondary opacity-75" aria-hidden size={18} />
      <span className="flex-grow-1">{label}</span>
      <span className="badge bg-secondary opacity-75">{phase}</span>
    </Nav.Link>
  );
}
