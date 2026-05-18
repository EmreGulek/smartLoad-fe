import { Badge, Card } from 'react-bootstrap';
import CargoImporterPanel from '../components/cargoImporter/CargoImporterPanel';

/**
 * Cargo Importer — Excel or blank table, editable grid in-browser (Phase 1; API later).
 */
export default function CargoImporterPage() {
  return (
    <div className="d-flex flex-column h-100">
      <header className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">Cargo Importer</h2>
          <small className="text-muted aviation-mono">
            Import Excel or start blank — edit cells and rows/columns in the browser until API ingest lands
          </small>
        </div>
        <div className="d-flex gap-2">
          <Badge bg="info" text="dark">
            Client-side edit
          </Badge>
          <Badge bg="secondary">xlsx</Badge>
        </div>
      </header>

      <Card className="shadow-sm">
        <Card.Body>
          <CargoImporterPanel />
        </Card.Body>
      </Card>
    </div>
  );
}
