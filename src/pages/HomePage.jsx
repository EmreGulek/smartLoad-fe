import { Link } from 'react-router-dom';
import { Row, Col, Card, Button, Badge } from 'react-bootstrap';
import {
  FaFileDownload,
  FaFilePdf,
  FaHistory,
  FaPlane,
  FaTachometerAlt,
  FaUserShield,
} from 'react-icons/fa';

/**
 * Landing page with quick-action cards for each operational area.
 * Future-phase actions are visible but disabled.
 */
export default function HomePage() {
  return (
    <>
      <header className="mb-4">
        <h1 className="mb-1">Welcome, Loadmaster</h1>
        <p className="text-muted mb-0">
          B777F cargo loading planning system — overview &amp; quick actions
        </p>
      </header>

      <Row className="g-4">
        <Col md={6} lg={4}>
          <ActionCard
            Icon={FaPlane}
            title="B777F Viewer"
            description="Interactive 3D visualization of the main deck and lower deck cargo positions."
            cta={{ to: '/viewer', label: 'Open Viewer', variant: 'primary' }}
            available
          />
        </Col>

        <Col md={6} lg={4}>
          <ActionCard
            Icon={FaFileDownload}
            title="Cargo Importer"
            description="Upload a cargo manifest (Excel), preview parsed rows, then send to the planner when the API is ready."
            cta={{ to: '/cargo-importer', label: 'Open Importer', variant: 'primary' }}
            available
          />
        </Col>

        <Col md={6} lg={4}>
          <ActionCard
            Icon={FaHistory}
            title="Recent Plans"
            description="View previously generated load plans and reports."
            cta={{ label: 'Available in Phase 1', variant: 'outline-secondary' }}
            phase="Phase 1"
          />
        </Col>

        <Col md={6} lg={4}>
          <ActionCard
            Icon={FaTachometerAlt}
            title="CG Validation"
            description="Real-time center of gravity & MAC% verification against operating envelope."
            cta={{ label: 'Available in Phase 4', variant: 'outline-secondary' }}
            phase="Phase 4"
          />
        </Col>

        <Col md={6} lg={4}>
          <ActionCard
            Icon={FaFilePdf}
            title="LIR / Load Sheet"
            description="Generate Load Instruction Report and Weight & Balance Manifest as PDF."
            cta={{ label: 'Available in Phase 5', variant: 'outline-secondary' }}
            phase="Phase 5"
          />
        </Col>

        <Col md={6} lg={4}>
          <ActionCard
            Icon={FaUserShield}
            title="Sign In"
            description="Loadmaster authentication via JWT (planned)."
            cta={{ label: 'Available in Phase 6', variant: 'outline-secondary' }}
            phase="Phase 6"
          />
        </Col>
      </Row>
    </>
  );
}

function ActionCard({ Icon, title, description, cta, available = false, phase }) {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body className="d-flex flex-column">
        <Card.Title className="d-flex align-items-center mb-2">
          <Icon className="text-primary me-2 flex-shrink-0" aria-hidden size={26} />
          <span className="flex-grow-1">{title}</span>
          {!available && phase && (
            <Badge bg="light" text="dark" className="text-uppercase">
              {phase}
            </Badge>
          )}
        </Card.Title>
        <Card.Text className="text-muted small flex-grow-1">{description}</Card.Text>
        {available ? (
          <Button as={Link} to={cta.to} variant={cta.variant}>
            {cta.label}
          </Button>
        ) : (
          <Button variant={cta.variant} disabled>
            {cta.label}
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}
