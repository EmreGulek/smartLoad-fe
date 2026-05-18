import { Card, Badge, Row, Col } from 'react-bootstrap';
import { FaInfoCircle } from 'react-icons/fa';
import B777FViewer from '../components/viewer/B777FViewer';

/**
 * 3D Viewer page — wraps the B777FViewer canvas with metadata and legend.
 */
export default function ViewerPage() {
  return (
    <div className="d-flex flex-column h-100">
      <header className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">B777F Viewer</h2>
          <small className="text-muted aviation-mono">
            Flight TK-DEV-001 — Static Layout (Phase 0)
          </small>
        </div>
        <div className="d-flex gap-2">
          <Badge bg="warning" text="dark">Hardcoded contours</Badge>
          <Badge bg="info" text="dark">Phase 0</Badge>
        </div>
      </header>

      <Card className="flex-grow-1 mb-3" style={{ minHeight: 500 }}>
        <Card.Body className="p-0">
          <div className="viewer-canvas-wrapper">
            <B777FViewer />
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Card.Title className="h6 mb-3 d-flex align-items-center">
            <FaInfoCircle className="me-2 text-primary flex-shrink-0" aria-hidden size={18} />
            Contour Legend
          </Card.Title>
          <Row className="g-2 small">
            <ContourLegendItem color="#ffaa00" label="A — Q4 Nose (88×125 in, 295 cm)" />
            <ContourLegendItem color="#00ff88" label="M — Q5 Standard (88×125 in, 300 cm)" />
            <ContourLegendItem color="#9900ff" label="G — Q6 Centerline (96×238.5 in, 300 cm)" />
            <ContourLegendItem color="#0088ff" label="R High — 16ft Pallet (96×196 in, 274 cm)" />
            <ContourLegendItem color="#0055aa" label="R Low — 16ft Pallet (96×196 in, 243 cm)" />
            <ContourLegendItem color="#00ffff" label="LD3 — Lower Deck (156×163 cm)" />
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
}

function ContourLegendItem({ color, label }) {
  return (
    <Col xs={12} sm={6} md={4} lg={3}>
      <span className="d-inline-flex align-items-center">
        <span
          className="d-inline-block me-2"
          style={{
            width: 14,
            height: 14,
            background: color,
            borderRadius: 2,
            border: '1px solid rgba(0,0,0,0.1)',
          }}
        />
        <span>{label}</span>
      </span>
    </Col>
  );
}
