import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import { Link, useParams } from 'react-router-dom';
import ManifestSourceGrid from '../components/manifest/ManifestSourceGrid';
import { api } from '../services/api';
import { downloadSourceGridAsXlsx } from '../utils/exportSourceGrid';

export default function ManifestDetailPage() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [source, setSource] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const summaryRes = await api.get(`/manifests/${id}`);
      setSummary(summaryRes.data);

      try {
        const sourceRes = await api.get(`/manifests/${id}/source`);
        setSource(sourceRes.data);
      } catch (srcErr) {
        if (srcErr?.response?.status !== 404) {
          throw srcErr;
        }
        setSource(null);
      }

      try {
        const packagesRes = await api.get(`/manifests/${id}/packages`);
        setPackages(Array.isArray(packagesRes.data) ? packagesRes.data : []);
      } catch {
        setPackages([]);
      }
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load manifest.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const highlightRows = useMemo(
    () => packages.map((p) => p.sourceRowNumber).filter((n) => n != null),
    [packages],
  );

  const handleExport = () => {
    const grid = source?.sourceGrid;
    if (!grid?.headers?.length) {
      return;
    }
    downloadSourceGridAsXlsx({
      headers: grid.headers,
      rows: grid.rows,
      sheetName: grid.sheetName,
      fileName: summary?.fileName || 'manifest',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <div className="text-muted mt-2 small">Loading manifest…</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <strong>Error:</strong> {error}
        <div className="mt-2">
          <Button as={Link} to="/manifests" variant="outline-secondary" size="sm">
            <FaArrowLeft className="me-1" /> Back to list
          </Button>
        </div>
      </Alert>
    );
  }

  const grid = source?.sourceGrid;
  const volumeM3 =
    summary?.totalVolumeMm3 != null ? (summary.totalVolumeMm3 / 1_000_000_000).toFixed(2) : '—';

  return (
    <div className="d-flex flex-column h-100">
      <header className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <Button as={Link} to="/manifests" variant="link" className="p-0 mb-1 text-decoration-none">
            <FaArrowLeft className="me-1" size={12} /> Manifests
          </Button>
          <h2 className="mb-0 aviation-mono">{summary?.fileName || 'Manifest'}</h2>
          <small className="text-muted d-block">
            Immutable import snapshot — source grid is read-only. Package edits use the working set
            (audit logged).
          </small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Badge bg={summary?.status === 'SAVED' ? 'success' : 'secondary'}>{summary?.status}</Badge>
          {grid?.headers?.length > 0 && (
            <Button variant="outline-primary" size="sm" onClick={handleExport}>
              <FaDownload className="me-1" size={12} />
              Export Excel (rebuilt)
            </Button>
          )}
        </div>
      </header>

      <Card className="shadow-sm mb-3">
        <Card.Body className="py-2">
          <div className="d-flex flex-wrap gap-4 small">
            <span>
              <strong>Pieces:</strong> {summary?.totalPieces ?? '—'}
            </span>
            <span>
              <strong>Weight:</strong>{' '}
              {summary?.totalWeightKg != null ? `${summary.totalWeightKg.toFixed(1)} kg` : '—'}
            </span>
            <span>
              <strong>Volume:</strong> {volumeM3} m³
            </span>
            <span>
              <strong>Capacity:</strong>{' '}
              {summary?.capacityPercentage != null
                ? `${summary.capacityPercentage.toFixed(1)}%`
                : '—'}
            </span>
            <span className="text-muted">
              <strong>ID:</strong> <code>{id}</code>
            </span>
          </div>
        </Card.Body>
      </Card>

      {!summary?.hasSourceGrid && (
        <Alert variant="warning" className="small">
          This manifest was saved before source grid storage. Only summary metadata is available.
        </Alert>
      )}

      <Card className="shadow-sm flex-grow-1 d-flex flex-column min-h-0 manifest-detail-grid-card">
        <Card.Header className="bg-body-secondary py-2 small fw-medium flex-shrink-0">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span>
              Import grid (read-only)
              {grid?.sheetName && (
                <span className="text-muted fw-normal ms-2">Sheet: {grid.sheetName}</span>
              )}
            </span>
            {grid?.headers?.length > 0 && (
              <span className="text-muted fw-normal">
                {grid.headers.length} columns — scroll horizontally for more →
              </span>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-0 flex-grow-1 min-h-0">
          {grid ? (
            <ManifestSourceGrid
              headers={grid.headers}
              rows={grid.rows}
              highlightRowNumbers={highlightRows}
            />
          ) : (
            <div className="text-muted small p-4 text-center">No source grid available.</div>
          )}
        </Card.Body>
      </Card>

      {packages.length > 0 && (
        <p className="text-muted small mt-2 mb-0">
          Highlighted rows match persisted packages ({packages.length} working-set rows). Yellow
          rows use <code>source_row_number</code> round-trip (Excel row = grid index + 2).
        </p>
      )}
    </div>
  );
}
