import { NavLink } from 'react-router-dom';
import { Nav } from 'react-bootstrap';
import { BsGrid3X3Gap } from 'react-icons/bs';
import {
  FaBalanceScale,
  FaBars,
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
 * Collapsible: when `collapsed`, shrinks to an icon-only rail (labels hidden,
 * tooltips via title). Active phase items are clickable; future-phase items are
 * disabled placeholders.
 */
export default function Sidebar({ collapsed = false, onToggle }) {
  return (
    <aside className={`smartload-sidebar${collapsed ? ' collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle btn btn-sm btn-light w-100 mb-3 d-flex align-items-center justify-content-center"
        onClick={onToggle}
        title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
        aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
      >
        <FaBars size={16} />
        {!collapsed && <span className="ms-2 small">Menüyü daralt</span>}
      </button>

      <SidebarSection label="Operations" collapsed={collapsed}>
        <SidebarLink to="/" end Icon={FaHome} label="Home" collapsed={collapsed} />
        <SidebarLink to="/viewer" Icon={FaPlane} label="B777F Viewer" collapsed={collapsed} />
      </SidebarSection>

      <SidebarSection label="Planning" collapsed={collapsed}>
        <SidebarLink to="/cargo-importer" Icon={FaFileDownload} label="Cargo Importer" collapsed={collapsed} />
        <SidebarLink to="/manifests" Icon={FaTable} label="Manifests" collapsed={collapsed} />
        <SidebarLink to="/load-plan" Icon={BsGrid3X3Gap} label="Load Plan" collapsed={collapsed} />
        <SidebarLink to="/benchmark" Icon={FaBalanceScale} label="Benchmark" collapsed={collapsed} />
        <SidebarPlaceholder Icon={FaTachometerAlt} label="CG Validation" phase="Phase 4" collapsed={collapsed} />
      </SidebarSection>

      <SidebarSection label="Reports" collapsed={collapsed}>
        <SidebarPlaceholder Icon={FaFilePdf} label="LIR" phase="Phase 5" collapsed={collapsed} />
        <SidebarPlaceholder Icon={FaClipboardList} label="Load Sheet" phase="Phase 5" collapsed={collapsed} />
      </SidebarSection>

      <SidebarSection label="Admin" collapsed={collapsed}>
        <SidebarPlaceholder Icon={FaUsers} label="Users" phase="Phase 6" collapsed={collapsed} />
        <SidebarPlaceholder Icon={FaCog} label="Settings" phase="Phase 6" collapsed={collapsed} />
      </SidebarSection>
    </aside>
  );
}

function SidebarSection({ label, children, collapsed }) {
  return (
    <div className="mb-3">
      {!collapsed && (
        <div className="text-uppercase small fw-bold text-secondary px-3 mb-1">{label}</div>
      )}
      <Nav className="flex-column">{children}</Nav>
    </div>
  );
}

function SidebarLink({ to, end, Icon, label, collapsed }) {
  return (
    <Nav.Link
      as={NavLink}
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className="d-flex align-items-center"
    >
      <Icon className={collapsed ? '' : 'me-2'} aria-hidden size={18} style={{ flexShrink: 0 }} />
      {!collapsed && label}
    </Nav.Link>
  );
}

function SidebarPlaceholder({ Icon, label, phase, collapsed }) {
  return (
    <Nav.Link
      disabled
      title={collapsed ? `${label} · ${phase}` : undefined}
      className="d-flex align-items-center"
    >
      <Icon
        className={`${collapsed ? '' : 'me-2'} text-secondary opacity-75`}
        aria-hidden
        size={18}
        style={{ flexShrink: 0 }}
      />
      {!collapsed && (
        <>
          <span className="flex-grow-1">{label}</span>
          <span className="badge bg-secondary opacity-75">{phase}</span>
        </>
      )}
    </Nav.Link>
  );
}
