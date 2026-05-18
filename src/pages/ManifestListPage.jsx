import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Modal, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEye, FaSync, FaTrash } from 'react-icons/fa';
import { api } from '../services/api';

/**
 * Manifest list page — saved manifests with delete + refresh.
 * Satisfies MASTER-PLAN Faz 1 acceptance: "saved manifests are listed, user can pick a row
 * and delete it".
 */
export default function ManifestListPage() {
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null); // manifest id being deleted
  const [confirmTarget, setConfirmTarget] = useState(null); // manifest object pending delete

  const fetchManifests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/manifests/list');
      if (!Array.isArray(data)) {
        throw new Error('Unexpected response from server. Try signing out and back in.');
      }
      // Backend returns newest first only if the DB row order matches; sort by createdAt desc.
      const sorted = [...data].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
      setManifests(sorted);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load manifests.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  const handleDelete = useCallback(async (manifest) => {
    setDeleting(manifest.id);
    setError('');
    try {
      await api.delete(`/manifests/${manifest.id}`);
      setManifests((prev) => prev.filter((m) => m.id !== manifest.id));
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to delete manifest.',
      );
    } finally {
      setDeleting(null);
      setConfirmTarget(null);
    }
  }, []);

  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="d-flex flex-column h-100">
      <header className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">Manifests</h2>
          <small className="text-muted aviation-mono">
            Saved cargo manifests — newest first
          </small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Badge bg="info" text="dark">
            {manifests.length} saved
          </Badge>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={fetchManifests}
            disabled={loading}
          >
            <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} size={12} />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <strong>Error:</strong> {error}
        </Alert>
      )}

      <Card className="shadow-sm">
        <Card.Body className="p-0">
          {loading && manifests.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <div className="text-muted mt-2 small">Loading manifests…</div>
            </div>
          ) : manifests.length === 0 ? (
            <div className="text-center py-5">
              <div className="text-muted mb-2">No manifests saved yet.</div>
              <small className="text-muted">
                Use <a href="/cargo-importer">Cargo Importer</a> to upload and save a manifest.
              </small>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle small">
                <thead className="table-light">
                  <tr>
                    <th>File</th>
                    <th>Status</th>
                    <th className="text-end">Pieces</th>
                    <th className="text-end">Weight (kg)</th>
                    <th className="text-end">Volume (m³)</th>
                    <th className="text-end">Capacity</th>
                    <th>Saved at</th>
                    <th className="text-center" style={{ width: 120 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {manifests.map((m) => {
                    const volumeM3 =
                      m.totalVolumeMm3 != null ? (m.totalVolumeMm3 / 1_000_000_000).toFixed(2) : '—';
                    const capacityClass =
                      m.capacityPercentage != null && m.capacityPercentage > 100
                        ? 'text-danger fw-semibold'
                        : '';
                    return (
                      <tr key={m.id}>
                        <td className="aviation-mono text-truncate" style={{ maxWidth: 240 }} title={m.fileName}>
                          <Link to={`/manifests/${m.id}`} className="text-decoration-none">
                            {m.fileName || <em className="text-muted">unnamed</em>}
                          </Link>
                        </td>
                        <td>
                          <Badge bg={m.status === 'SAVED' ? 'success' : 'secondary'}>
                            {m.status || 'DRAFT'}
                          </Badge>
                        </td>
                        <td className="text-end">{m.totalPieces ?? '—'}</td>
                        <td className="text-end">
                          {m.totalWeightKg != null ? m.totalWeightKg.toFixed(1) : '—'}
                        </td>
                        <td className="text-end">{volumeM3}</td>
                        <td className={`text-end ${capacityClass}`}>
                          {m.capacityPercentage != null
                            ? `${m.capacityPercentage.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="text-muted small">{formatDate(m.createdAt)}</td>
                        <td className="text-center">
                          <Button
                            as={Link}
                            to={`/manifests/${m.id}`}
                            variant="outline-primary"
                            size="sm"
                            className="me-1"
                            title="View import grid"
                          >
                            <FaEye size={12} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            disabled={deleting === m.id}
                            onClick={() => setConfirmTarget(m)}
                            title="Delete manifest"
                          >
                            {deleting === m.id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <FaTrash size={12} />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal
        show={confirmTarget !== null}
        onHide={() => setConfirmTarget(null)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete manifest?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            This will permanently remove the manifest from the database. This action cannot be
            undone.
          </p>
          {confirmTarget && (
            <div className="bg-light rounded p-2 small">
              <div>
                <strong>File:</strong> <span className="aviation-mono">{confirmTarget.fileName}</span>
              </div>
              <div>
                <strong>ID:</strong> <code>{confirmTarget.id}</code>
              </div>
              <div>
                <strong>Pieces:</strong> {confirmTarget.totalPieces} ·{' '}
                <strong>Weight:</strong> {confirmTarget.totalWeightKg?.toFixed(1)} kg
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setConfirmTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => confirmTarget && handleDelete(confirmTarget)}
            disabled={deleting !== null}
          >
            {deleting !== null ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting…
              </>
            ) : (
              <>
                <FaTrash className="me-1" size={12} />
                Delete
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
