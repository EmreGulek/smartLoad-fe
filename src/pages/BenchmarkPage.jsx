/**
 * BenchmarkPage — Phase 6: algorithm comparison for the thesis experimental chapter.
 *
 * Runs the same manifest through three algorithms (FFD, EP-V1 CG-blind,
 * EP-V2 CG-aware) and shows a side-by-side metric table. Results can be
 * exported as CSV for the thesis.
 */

import { useEffect, useState } from 'react';
import {
  Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Table,
} from 'react-bootstrap';
import { FaBalanceScale, FaDownload, FaPlay } from 'react-icons/fa';
import { api, runBenchmark } from '../services/api';

export default function BenchmarkPage() {
  const [manifests,   setManifests]   = useState([]);
  const [selectedMid, setSelectedMid] = useState('');
  const [flightStops, setFlightStops] = useState('');
  const [running,     setRunning]     = useState(false);
  const [rows,        setRows]        = useState(null);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    api.get('/manifests/list').then(r => setManifests(r.data)).catch(() => {});
  }, []);

  async function handleRun() {
    if (!selectedMid) return;
    setRunning(true);
    setError(null);
    setRows(null);
    try {
      const stops = flightStops.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const data = await runBenchmark(selectedMid, 1, stops);
      setRows(data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Benchmark failed');
    } finally {
      setRunning(false);
    }
  }

  function exportCsv() {
    if (!rows) return;
    const header = ['Algorithm', 'AlgorithmId', 'TimeMs', 'Placed', 'Total',
      'UtilizationPct', 'TotalWeightKg', 'UsedPositions', 'CgMacPct', 'CgStatus', 'CgFeasible'];
    const lines = rows.map(r => [
      r.label, r.algorithm, r.timeMs, r.placedPackages, r.totalPackages,
      r.utilizationPct, r.totalWeightKg, r.usedPositions,
      r.cgMacPct ?? '', r.cgStatus ?? '', r.cgFeasible,
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-${selectedMid.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Best-value highlighting helpers
  const bestUtil = rows ? Math.max(...rows.map(r => r.utilizationPct)) : null;
  const bestPlaced = rows ? Math.max(...rows.map(r => r.placedPackages)) : null;
  const fastest = rows ? Math.min(...rows.map(r => r.timeMs)) : null;

  function cgVariant(s) {
    if (!s) return 'secondary';
    if (s === 'GREEN') return 'success';
    return s.startsWith('RED') ? 'danger' : 'warning';
  }

  return (
    <Container fluid className="py-3">
      <h4 className="mb-3">
        <FaBalanceScale className="me-2 text-primary" />
        Algorithm Benchmark
        <span className="text-muted small fw-normal ms-2">FFD vs EP-V1 vs EP-V2 (CG-aware)</span>
      </h4>

      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-end g-3">
            <Col md={5}>
              <Form.Label className="fw-semibold">Manifest</Form.Label>
              <Form.Select value={selectedMid} onChange={e => setSelectedMid(e.target.value)} disabled={running}>
                <option value="">— select a saved manifest —</option>
                {manifests.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.fileName || m.id.slice(0, 8)} · {m.totalPieces} pkgs · {m.totalWeightKg?.toFixed(0)} kg
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label className="fw-semibold">Flight Stops <span className="text-muted fw-normal" style={{ fontSize: 12 }}>— optional (LOFO)</span></Form.Label>
              <Form.Control type="text" placeholder="e.g. IST, FRA, JFK"
                value={flightStops} onChange={e => setFlightStops(e.target.value)} disabled={running} />
            </Col>
            <Col md="auto">
              <Button variant="primary" disabled={!selectedMid || running} onClick={handleRun}>
                {running ? <><Spinner size="sm" className="me-2" />Running…</> : <><FaPlay className="me-2" />Run benchmark</>}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {rows && (
        <Card>
          <Card.Header className="d-flex align-items-center">
            <span className="fw-semibold">Comparison</span>
            <span className="text-muted small ms-2">— best value per metric highlighted</span>
            <Button size="sm" variant="outline-secondary" className="ms-auto" onClick={exportCsv}>
              <FaDownload className="me-2" />Export CSV
            </Button>
          </Card.Header>
          <Table size="sm" hover responsive className="mb-0 align-middle">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th className="text-end">Time (ms)</th>
                <th className="text-end">Placed</th>
                <th className="text-end">Utilisation</th>
                <th className="text-end">Weight (kg)</th>
                <th className="text-end">Positions</th>
                <th className="text-end">CG %MAC</th>
                <th>CG status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.algorithm}>
                  <td>
                    <div className="fw-semibold">{r.label}</div>
                    <code className="small text-muted">{r.algorithm}</code>
                  </td>
                  <td className="text-end">
                    {r.timeMs}{r.timeMs === fastest && <Badge bg="info" className="ms-1">fastest</Badge>}
                  </td>
                  <td className="text-end">
                    {r.placedPackages}/{r.totalPackages}
                    {r.placedPackages === bestPlaced && <Badge bg="success" className="ms-1">best</Badge>}
                  </td>
                  <td className="text-end">
                    {r.utilizationPct?.toFixed(1)}%
                    {r.utilizationPct === bestUtil && <Badge bg="success" className="ms-1">best</Badge>}
                  </td>
                  <td className="text-end">{r.totalWeightKg?.toFixed(0)}</td>
                  <td className="text-end">{r.usedPositions}</td>
                  <td className="text-end">{r.cgMacPct != null ? `${r.cgMacPct.toFixed(1)}%` : '—'}</td>
                  <td><Badge bg={cgVariant(r.cgStatus)}>{r.cgStatus || '—'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Card.Footer className="text-muted small">
            Not: FFD hacim-bazlı naive baseline'dır (3D geometri yok) → utilization'ı olduğundan yüksek gösterebilir.
            Süre persistence dahildir. Her koşu görüntülenebilir bir LoadPlan kaydı bırakır.
          </Card.Footer>
        </Card>
      )}
    </Container>
  );
}
