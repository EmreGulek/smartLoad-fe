/**
 * LoadPlanPage — Phase 3: Bin packing optimisation UI.
 *
 * Flow:
 *   1. User selects a saved manifest from the dropdown.
 *   2. Clicks "Optimize" → POST /api/load-plans/optimize.
 *   3. On success, fetches the full LoadPlanResultDto.
 *   4. Shows stats panel + opens the B777FViewer with package placement data.
 */

import { useEffect, useState } from 'react';
import {
  Alert, Badge, Button, Card, Col, Container,
  Form, ProgressBar, Row, Spinner, Table,
} from 'react-bootstrap';
import { FaCube, FaPlay, FaFilePdf, FaBalanceScale } from 'react-icons/fa';
import UldDetailPanel from '../components/viewer/UldDetailPanel';
import {
  fetchLoadPlan,
  fetchLoadPlansForManifest,
  optimizeLoadPlan,
  lirPdfUrl,
  loadSheetPdfUrl,
  openPdfReport,
} from '../services/api';
import { api } from '../services/api';
import B777FViewer from '../components/viewer/B777FViewer';

export default function LoadPlanPage() {
  const [manifests,    setManifests]    = useState([]);
  const [selectedMid,  setSelectedMid]  = useState('');
  const [flightStops,  setFlightStops]  = useState('');   // e.g. "IST,FRA,JFK"
  const [running,      setRunning]      = useState(false);
  const [loadPlan,     setLoadPlan]     = useState(null);
  const [pastPlans,    setPastPlans]    = useState([]);
  const [error,        setError]        = useState(null);

  // Load saved manifests on mount
  useEffect(() => {
    api.get('/manifests/list').then(r => setManifests(r.data)).catch(() => {});
  }, []);

  // When manifest changes, load its past plans
  useEffect(() => {
    if (!selectedMid) { setPastPlans([]); return; }
    fetchLoadPlansForManifest(selectedMid).then(setPastPlans).catch(() => {});
  }, [selectedMid]);

  async function handleOptimize() {
    if (!selectedMid) return;
    setRunning(true);
    setError(null);
    setLoadPlan(null);
    try {
      // Parse flight stops: "IST, FRA, JFK" → ["IST","FRA","JFK"]
      const stops = flightStops
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      const { loadPlanId } = await optimizeLoadPlan(selectedMid, 1, stops);
      const plan = await fetchLoadPlan(loadPlanId);
      setLoadPlan(plan);
      // Refresh past plans list
      fetchLoadPlansForManifest(selectedMid).then(setPastPlans).catch(() => {});
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Optimisation failed');
    } finally {
      setRunning(false);
    }
  }

  async function handleLoadPlan(planId) {
    setError(null);
    try {
      const plan = await fetchLoadPlan(planId);
      setLoadPlan(plan);
    } catch {
      setError('Failed to load plan');
    }
  }

  return (
    <Container fluid className="py-3">
      <h4 className="mb-3">
        <FaCube className="me-2 text-primary" />
        Load Plan — 3D Bin Packing
      </h4>

      {/* ── Controls ── */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-end g-3">
            <Col md={5}>
              <Form.Label className="fw-semibold">Manifest</Form.Label>
              <Form.Select
                value={selectedMid}
                onChange={e => setSelectedMid(e.target.value)}
                disabled={running}
              >
                <option value="">— select a saved manifest —</option>
                {manifests.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.fileName || m.id.slice(0, 8)} &nbsp;·&nbsp;
                    {m.totalPieces} pkgs &nbsp;·&nbsp;
                    {m.totalWeightKg?.toFixed(0)} kg
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label className="fw-semibold d-flex align-items-center gap-1">
                Flight Stops
                <span className="text-muted fw-normal" style={{ fontSize: 12 }}>
                  &nbsp;— LOFO order (first stop first)
                </span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. IST, FRA, JFK"
                value={flightStops}
                onChange={e => setFlightStops(e.target.value)}
                disabled={running}
              />
            </Col>
            <Col md="auto">
              <Button
                variant="success"
                disabled={!selectedMid || running}
                onClick={handleOptimize}
              >
                {running
                  ? <><Spinner size="sm" className="me-2" />Optimising…</>
                  : <><FaPlay className="me-2" />Optimize</>}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* ── Past plans for this manifest ── */}
      {pastPlans.length > 0 && !loadPlan && (
        <Card className="mb-3">
          <Card.Header className="fw-semibold">Previous plans for this manifest</Card.Header>
          <Table size="sm" hover className="mb-0">
            <thead>
              <tr>
                <th>#</th><th>Status</th><th>Algorithm</th>
                <th>Placed</th><th>Utilisation</th><th>CG %MAC</th><th>Created</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pastPlans.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td><Badge bg={p.status === 'OPTIMIZED' ? 'success' : 'secondary'}>{p.status}</Badge></td>
                  <td><code className="small">{p.algorithm}</code></td>
                  <td>{p.placedPackages}/{p.totalPackages}</td>
                  <td>{p.utilizationPct?.toFixed(1)}%</td>
                  <td>
                    {p.cgStatus
                      ? <Badge bg={p.cgStatus === 'GREEN' ? 'success' : p.cgStatus.startsWith('RED') ? 'danger' : 'warning'}>
                          {p.cgMacPct?.toFixed(1)}%
                        </Badge>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td className="text-muted small">{new Date(p.createdAt).toLocaleString()}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => handleLoadPlan(p.id)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* ── Result ── */}
      {loadPlan && <LoadPlanResult plan={loadPlan} onBack={() => setLoadPlan(null)} />}
    </Container>
  );
}

// ── Result panel ─────────────────────────────────────────────────────────────

function LoadPlanResult({ plan, onBack }) {
  const unplaced = plan.totalPackages - plan.placedPackages;
  const [selectedCode, setSelectedCode] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  function handleUldClick(positionCode, assignment) {
    if (selectedCode === positionCode) {
      // second click → close panel
      setSelectedCode(null);
      setSelectedAssignment(null);
    } else {
      setSelectedCode(positionCode);
      setSelectedAssignment(assignment);
    }
  }

  const hasPlacements = plan.placedPackages > 0;

  return (
    <>
      {/* Report actions */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <span className="text-muted small me-1">Reports:</span>
        <Button
          size="sm"
          variant="outline-danger"
          disabled={!hasPlacements}
          onClick={() => openPdfReport(lirPdfUrl(plan.id))}
        >
          <FaFilePdf className="me-2" />Generate LIR
        </Button>
        <Button
          size="sm"
          variant="outline-primary"
          disabled={!hasPlacements}
          onClick={() => openPdfReport(loadSheetPdfUrl(plan.id))}
        >
          <FaBalanceScale className="me-2" />Load Sheet
        </Button>
        <span className="text-muted small ms-1">— A4, printable & signable (PDF)</span>
      </div>

      {/* Summary strip */}
      <Row className="g-3 mb-3">
        <Col xs={6} md={2}>
          <StatCard label="Volume utilisation" value={`${plan.utilizationPct?.toFixed(1)}%`} variant="success">
            <ProgressBar now={plan.utilizationPct} className="mt-1" style={{ height: 6 }} />
          </StatCard>
        </Col>
        <Col xs={6} md={2}>
          <StatCard
            label="Packages placed"
            value={`${plan.placedPackages} / ${plan.totalPackages}`}
            variant={unplaced > 0 ? 'warning' : 'success'}
          />
        </Col>
        <Col xs={6} md={2}>
          <StatCard label="Total weight" value={`${plan.totalWeightKg?.toFixed(0)} kg`} />
        </Col>
        <Col xs={6} md={2}>
          <StatCard label="ULD positions used" value={`${plan.usedPositions}`} />
        </Col>
        {plan.cg && (
          <Col xs={12} md={4}>
            <CgGauge cg={plan.cg} />
          </Col>
        )}
      </Row>

      {unplaced > 0 && (
        <Alert variant="warning">
          ⚠️ {unplaced} package(s) could not be placed — aircraft capacity exceeded or items too large.
        </Alert>
      )}

      {/* 3D viewer — tıklamak tablo satırını highlight eder */}
      <Card className="mb-3">
        <Card.Header className="fw-semibold d-flex align-items-center gap-2">
          3D Loading View
          <Badge bg="secondary">{plan.algorithm}</Badge>
          <span className="text-muted small ms-2 fw-normal">
            Click a ULD or a table row to inspect
          </span>
        </Card.Header>
        <Card.Body style={{ height: 480, padding: 0 }}>
          <B777FViewer
            loadPlan={plan}
            onUldClick={handleUldClick}
            selectedPositionCode={selectedCode}
          />
        </Card.Body>
      </Card>

      {/* ULD breakdown table */}
      <Card className="mb-3">
        <Card.Header className="fw-semibold d-flex align-items-center gap-2">
          ULD Assignments
          <span className="text-muted small fw-normal">— click a row to inspect</span>
        </Card.Header>
        <Table size="sm" hover responsive className="mb-0">
          <thead>
            <tr>
              <th>Position</th><th>ULD Type</th>
              <th>Packages</th><th>Weight (kg)</th><th>Utilisation</th>
              <th>Destination</th><th title="LOFO: 1 = first to load (deepest), N = last to load (near door)">Load Order</th>
            </tr>
          </thead>
          <tbody>
            {plan.assignments.map(a => {
              const isActive = selectedCode === a.positionCode;
              const isEmpty  = a.packageCount === 0;
              return (
                <tr
                  key={a.id}
                  onClick={() => !isEmpty && handleUldClick(a.positionCode, a)}
                  style={{
                    cursor: isEmpty ? 'default' : 'pointer',
                    opacity: isEmpty ? 0.45 : 1,
                    background: isActive ? '#e8f4fd' : undefined,
                    borderLeft: isActive ? '3px solid #0d6efd' : '3px solid transparent',
                  }}
                >
                  <td>
                    <code style={{ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#0d6efd' : undefined }}>
                      {a.positionCode}
                    </code>
                  </td>
                  <td>
                    <span className="badge me-1" style={{ background: a.colorHex, color: '#fff' }}>
                      {a.uldTypeCode}
                    </span>
                    {a.uldTypeName}
                  </td>
                  <td>{a.packageCount || '—'}</td>
                  <td>{isEmpty ? '—' : a.totalWeightKg?.toFixed(1)}</td>
                  <td>
                    {isEmpty ? '—' : (
                      <ProgressBar
                        now={a.utilizationPct}
                        label={`${a.utilizationPct?.toFixed(0)}%`}
                        style={{ minWidth: 80 }}
                        variant={a.utilizationPct > 80 ? 'success' : a.utilizationPct > 50 ? 'info' : 'warning'}
                      />
                    )}
                  </td>
                  <td>
                    {a.dominantDestination
                      ? <DestBadge dest={a.dominantDestination} />
                      : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    {a.loadingOrder != null
                      ? <LoadOrderBadge order={a.loadingOrder} />
                      : <span className="text-muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {/* Detay paneli — TEK panel, tablo satırı veya 3D ULD tıklanınca açılır */}
      {selectedCode && selectedAssignment && (
        <Card className="mb-3" style={{ border: '2px solid #0d6efd' }}>
          <Card.Header
            className="d-flex align-items-center gap-2 fw-semibold"
            style={{ background: '#0d1117', color: '#e0e0e0' }}
          >
            <span style={{
              background: selectedAssignment.colorHex, color: '#fff',
              padding: '2px 10px', borderRadius: 4, fontSize: 13, fontWeight: 'bold',
            }}>
              {selectedCode}
            </span>
            {selectedAssignment.uldTypeName}
            <span className="small fw-normal ms-1" style={{ color: '#888' }}>
              · {selectedAssignment.packageCount} pkgs · {selectedAssignment.totalWeightKg?.toFixed(1)} kg · {selectedAssignment.utilizationPct?.toFixed(1)}%
            </span>
            <button
              onClick={() => { setSelectedCode(null); setSelectedAssignment(null); }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer' }}
            >✕</button>
          </Card.Header>
          <Card.Body style={{ padding: 0, height: 400, background: '#0d1117' }}>
            <UldDetailPanel
              assignment={selectedAssignment}
              onClose={() => { setSelectedCode(null); setSelectedAssignment(null); }}
              inline
            />
          </Card.Body>
        </Card>
      )}

      <Button variant="outline-secondary" onClick={onBack}>← Back</Button>
    </>
  );
}

function StatCard({ label, value, variant = 'primary', children }) {
  return (
    <Card className="h-100">
      <Card.Body className="py-2">
        <div className="text-muted small">{label}</div>
        <div className={`fs-5 fw-bold text-${variant}`}>{value}</div>
        {children}
      </Card.Body>
    </Card>
  );
}

/** Coloured badge for a 3-letter destination code. */
function DestBadge({ dest }) {
  // Simple deterministic hue from IATA code characters
  const hue = (dest.charCodeAt(0) * 47 + dest.charCodeAt(1) * 31 + (dest.charCodeAt(2) || 0) * 17) % 360;
  return (
    <span
      className="badge"
      style={{
        background: `hsl(${hue},55%,40%)`,
        color: '#fff',
        letterSpacing: 1,
        fontSize: 11,
        fontWeight: 'bold',
      }}
    >
      {dest}
    </span>
  );
}

// ── CG Gauge ──────────────────────────────────────────────────────────────────

/**
 * CgGauge — horizontal %MAC envelope gauge.
 *
 * Zones (left = forward/nose, right = aft/tail):
 *   RED  0–15%  | YELLOW 15–18%  | GREEN 18–33%  | YELLOW 33–37%  | RED 37–100%
 *
 * The vertical needle shows the current CG position.
 */
function CgGauge({ cg }) {
  const { cgMacPct, cgArmMm, status, fwdLimitPct, fwdWarnPct, aftWarnPct, aftLimitPct,
          totalWeightKg, oewKg } = cg;
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const statusColor = {
    GREEN:      '#198754',
    YELLOW_FWD: '#ffc107',
    YELLOW_AFT: '#ffc107',
    RED_FWD:    '#dc3545',
    RED_AFT:    '#dc3545',
  }[status] || '#6c757d';

  const statusLabel = {
    GREEN:      'CG — WITHIN LIMITS',
    YELLOW_FWD: 'CG — FORWARD WARNING',
    YELLOW_AFT: 'CG — AFT WARNING',
    RED_FWD:    'CG — FORWARD LIMIT EXCEEDED',
    RED_AFT:    'CG — AFT LIMIT EXCEEDED',
  }[status] || 'CG';

  const statusLabelShort = {
    GREEN:      'WITHIN LIMITS ✓',
    YELLOW_FWD: 'FORWARD WARNING ⚠',
    YELLOW_AFT: 'AFT WARNING ⚠',
    RED_FWD:    'FWD LIMIT EXCEEDED ✕',
    RED_AFT:    'AFT LIMIT EXCEEDED ✕',
  }[status] || status;

  const GAUGE_MIN = 0;
  const GAUGE_MAX = 50;
  const toX = pct => Math.max(0, Math.min(100, ((pct - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100));
  const needleX = toX(cgMacPct);
  const cargoKg = totalWeightKg - oewKg;

  return (
    <div className="card h-100" style={{ border: `2px solid ${statusColor}` }}>
      <div className="card-body py-2 px-3">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-1">
          <span className="small fw-bold" style={{ color: statusColor }}>{statusLabel}</span>
          <span className="small text-muted">{cgMacPct?.toFixed(1)} %MAC</span>
        </div>

        {/* Gauge bar */}
        <div style={{ position: 'relative', height: 20, borderRadius: 4, overflow: 'visible', marginBottom: 4 }}>
          {/* Colour zones */}
          <div style={{ position:'absolute', left:`${toX(GAUGE_MIN)}%`, width:`${toX(fwdLimitPct)-toX(GAUGE_MIN)}%`, height:'100%', background:'#dc3545', borderRadius:'4px 0 0 4px' }} />
          <div style={{ position:'absolute', left:`${toX(fwdLimitPct)}%`, width:`${toX(fwdWarnPct)-toX(fwdLimitPct)}%`, height:'100%', background:'#ffc107' }} />
          <div style={{ position:'absolute', left:`${toX(fwdWarnPct)}%`, width:`${toX(aftWarnPct)-toX(fwdWarnPct)}%`, height:'100%', background:'#198754' }} />
          <div style={{ position:'absolute', left:`${toX(aftWarnPct)}%`, width:`${toX(aftLimitPct)-toX(aftWarnPct)}%`, height:'100%', background:'#ffc107' }} />
          <div style={{ position:'absolute', left:`${toX(aftLimitPct)}%`, width:`${toX(GAUGE_MAX)-toX(aftLimitPct)}%`, height:'100%', background:'#dc3545', borderRadius:'0 4px 4px 0' }} />

          {/* Needle — hover/click shows tooltip */}
          <div
            onMouseEnter={() => setTooltipVisible(true)}
            onMouseLeave={() => setTooltipVisible(false)}
            onClick={() => setTooltipVisible(v => !v)}
            style={{
              position: 'absolute',
              left: `${needleX}%`,
              top: -6, bottom: -6,
              width: 10,
              cursor: 'pointer',
              transform: 'translateX(-50%)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Visible needle line */}
            <div style={{
              width: 3, height: '100%',
              background: '#fff',
              border: '1px solid #333',
              borderRadius: 2,
              boxShadow: '0 0 4px rgba(0,0,0,0.6)',
            }} />

            {/* Tooltip */}
            {tooltipVisible && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1a1a2e',
                color: '#e0e0e0',
                border: `1px solid ${statusColor}`,
                borderRadius: 6,
                padding: '8px 12px',
                whiteSpace: 'nowrap',
                fontSize: 12,
                lineHeight: 1.7,
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                zIndex: 100,
                pointerEvents: 'none',
              }}>
                {/* Arrow */}
                <div style={{
                  position: 'absolute',
                  top: '100%', left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: `6px solid ${statusColor}`,
                }} />

                <div style={{ fontWeight: 'bold', color: statusColor, marginBottom: 4 }}>
                  ✈ CG Position
                </div>
                <div><span style={{ color: '#888' }}>%MAC</span>&nbsp;&nbsp;
                  <strong style={{ color: statusColor }}>{cgMacPct?.toFixed(2)} %</strong>
                </div>
                <div><span style={{ color: '#888' }}>Arm&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;
                  {cgArmMm?.toFixed(0)} mm
                </div>
                <div><span style={{ color: '#888' }}>TOW&nbsp;&nbsp;&nbsp;</span>&nbsp;
                  {(totalWeightKg / 1000).toFixed(1)} t
                </div>
                <div><span style={{ color: '#888' }}>Cargo&nbsp;</span>&nbsp;
                  {(cargoKg / 1000).toFixed(1)} t
                </div>
                <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #333', color: statusColor, fontWeight: 'bold' }}>
                  {statusLabelShort}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scale labels */}
        <div style={{ position: 'relative', height: 14, marginBottom: 2 }}>
          {[0, fwdLimitPct, fwdWarnPct, aftWarnPct, aftLimitPct, GAUGE_MAX].map(v => (
            <span key={v} style={{
              position: 'absolute', left: `${toX(v)}%`,
              transform: 'translateX(-50%)', fontSize: 9, color: '#888',
            }}>{v}%</span>
          ))}
        </div>

        {/* Footer */}
        <div className="d-flex justify-content-between" style={{ fontSize: 11, color: '#999' }}>
          <span>← FWD (nose)</span>
          <span>TOW {(totalWeightKg/1000).toFixed(1)} t · cargo {(cargoKg/1000).toFixed(1)} t</span>
          <span>AFT (tail) →</span>
        </div>
      </div>
    </div>
  );
}

/**
 * LOFO loading order badge.
 * order=1 → first to load (deepest) → green
 * higher numbers → later to load → yellow → orange
 */
function LoadOrderBadge({ order }) {
  const colors = ['#198754','#0d6efd','#fd7e14','#dc3545','#6f42c1','#20c997'];
  const bg = colors[(order - 1) % colors.length];
  return (
    <span
      className="badge d-inline-flex align-items-center gap-1"
      style={{ background: bg, color: '#fff', fontVariantNumeric: 'tabular-nums' }}
      title={order === 1 ? 'First to load — deepest position' : `Load sequence ${order}`}
    >
      {order === 1 ? '▶ 1st load' : `▶ ${order}`}
    </span>
  );
}
