import { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Form, Table, Spinner } from 'react-bootstrap';
import { FaFolderOpen, FaMinus, FaPen, FaPlus, FaTable, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { RiFileExcel2Line } from 'react-icons/ri';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';
import ColumnMappingDialog from './ColumnMappingDialog';

/** Max rows read from Excel on first import (full sheets can be huge). */
const MAX_IMPORT_ROWS = 500;
/** Max columns read from Excel on first import. */
const MAX_IMPORT_COLS = 24;
const DEFAULT_COLS = 6;
const DEFAULT_ROWS = 4;

/**
 * Fallback size-bucket thresholds (m³). The backend echoes the canonical defaults on every
 * validation response as `statistics.sizeThresholdsM3`; these constants are only used until
 * that response arrives (or if the backend ever omits the field).
 */
const FALLBACK_THRESHOLDS_M3 = { small: 0.5, medium: 1.5, large: 4.0 };

/**
 * Map an average density (kg/m³) to a human-readable band + a Bootstrap colour variant.
 * Thresholds are operational rules of thumb — high-volume/low-density (insulation, garments)
 * vs high-density (metal, mineral). Loadmaster cue, not a hard limit.
 */
function densityBand(density) {
  if (density == null || isNaN(density)) return { label: 'n/a', variant: 'secondary' };
  if (density < 100) return { label: 'Light', variant: 'info' };
  if (density < 300) return { label: 'Normal', variant: 'success' };
  if (density < 600) return { label: 'Heavy', variant: 'warning' };
  return { label: 'Very heavy', variant: 'danger' };
}

/**
 * Bootstrap colour for a Special Handling Code badge. DG is always red because it's the most
 * operationally consequential. The full IATA SHC list is much longer; we only colour the ones
 * the backend currently validates (`VALID_SHC_CODES` in ManifestValidationService).
 */
function shcBadgeVariant(code) {
  switch ((code || '').toUpperCase()) {
    case 'DG':
      return 'danger';
    case 'AVI':
    case 'PER':
      return 'warning';
    case 'VAL':
      return 'info';
    case 'FRA':
      return 'secondary';
    default:
      return 'secondary';
  }
}

/**
 * Pad rows to a uniform width (capped at MAX_IMPORT_COLS).
 * @param {(string|number|null)[][]} rows
 * @returns {string[][]}
 */
function normalizeGrid(rows) {
  if (!rows.length) return [];
  const rawWidth = Math.max(1, ...rows.map((r) => (Array.isArray(r) ? r.length : 0)));
  const width = Math.min(rawWidth, MAX_IMPORT_COLS);
  return rows.map((row) => {
    const cells = Array.isArray(row) ? row : [];
    const out = cells.slice(0, width).map((c) => {
      if (c === null || c === undefined || c === '') return '';
      return String(c);
    });
    while (out.length < width) out.push('');
    return out;
  });
}

/**
 * Excel ingest + grid: read-only until user clicks Edit; then cells and row/column tools work (client-side only).
 */
export default function CargoImporterPanel() {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [grid, setGrid] = useState(/** @type {string[][]} */ ([]));
  const [editMode, setEditMode] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [columnMapping, setColumnMapping] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedManifest, setSavedManifest] = useState(null);
  // Size-bucket thresholds: `thresholdsM3` is what's currently applied; `defaultThresholds`
  // is whatever the backend last echoed (used by the "Reset to defaults" button). Both stay in
  // sync on the first validation; only `thresholdsM3` moves when the user edits.
  const [thresholdsM3, setThresholdsM3] = useState(FALLBACK_THRESHOLDS_M3);
  const [defaultThresholds, setDefaultThresholds] = useState(FALLBACK_THRESHOLDS_M3);
  const [editingThresholds, setEditingThresholds] = useState(false);

  const reset = useCallback(() => {
    setFileName('');
    setError('');
    setSheetName('');
    setGrid([]);
    setEditMode(false);
    setValidationResult(null);
    setThresholdsM3(FALLBACK_THRESHOLDS_M3);
    setDefaultThresholds(FALLBACK_THRESHOLDS_M3);
    setEditingThresholds(false);
    setSavedManifest(null);
  }, []);

  const handleMappingConfirmed = useCallback(async (mapping) => {
    setColumnMapping(mapping);
    setShowMappingDialog(false);
    setIsValidating(true);
    setError('');
    setValidationResult(null);

    try {
      // Extract headers and data rows
      const headers = grid.length > 0 ? grid[0] : [];
      const rows = grid.length > 1 ? grid.slice(1) : [];

      // Log for diagnostics
      console.log('📤 Validation Request:', {
        headerCount: headers.length,
        rowCount: rows.length,
        mapping,
        firstRow: rows[0],
      });

      const payload = {
        headers,
        rows: rows.map((r) => r.slice(0, headers.length)),
        columnMapping: mapping, // Send mapping info to backend
      };

      const response = await api.post('/manifests/validate-and-preview', payload);

      console.log('📥 Validation Response:', response.data);

      setValidationResult(response.data);
      // Sync the size-bucket thresholds with whatever the backend declared as default; the
      // user can still override afterwards via "Edit thresholds".
      const backendThresholds = response.data?.statistics?.sizeThresholdsM3;
      if (
        backendThresholds &&
        backendThresholds.small != null &&
        backendThresholds.medium != null &&
        backendThresholds.large != null
      ) {
        const synced = {
          small: Number(backendThresholds.small),
          medium: Number(backendThresholds.medium),
          large: Number(backendThresholds.large),
        };
        setDefaultThresholds(synced);
        setThresholdsM3(synced);
      }
      setEditingThresholds(false);
      setEditMode(false);
    } catch (err) {
      const errorMsg = err.response?.data?.message ||
                       err.response?.data?.error ||
                       err.message ||
                       'Validation failed. Please check your connection.';
      console.error('❌ Validation Error:', {
        status: err.response?.status,
        message: errorMsg,
        error: err.response?.data
      });
      setError(errorMsg);
    } finally {
      setIsValidating(false);
    }
  }, [grid]);

  const handleCommit = useCallback(() => {
    // Show column mapping dialog first
    setShowMappingDialog(true);
  }, []);

  /**
   * Recompute size buckets client-side using the currently-applied thresholds and the package
   * list the backend already returned. This is what makes the threshold editor feel live —
   * no request round-trips. Falls back to the backend's pre-computed buckets if the package
   * list is missing for any reason.
   */
  const sizeBuckets = useMemo(() => {
    const pkgs = validationResult?.packages;
    if (!Array.isArray(pkgs) || pkgs.length === 0) {
      return {
        small: validationResult?.statistics?.sizeSmall ?? 0,
        medium: validationResult?.statistics?.sizeMedium ?? 0,
        large: validationResult?.statistics?.sizeLarge ?? 0,
        oversize: validationResult?.statistics?.sizeOversize ?? 0,
      };
    }
    // Threshold inputs are m³; backend persists package dimensions in mm. 1 m³ = 10⁹ mm³.
    const smallMm3 = (Number(thresholdsM3.small) || 0) * 1_000_000_000;
    const mediumMm3 = (Number(thresholdsM3.medium) || 0) * 1_000_000_000;
    const largeMm3 = (Number(thresholdsM3.large) || 0) * 1_000_000_000;
    let s = 0, m = 0, l = 0, o = 0;
    for (const pkg of pkgs) {
      const volPerPieceMm3 =
        (Number(pkg.lengthMm) || 0) *
        (Number(pkg.widthMm) || 0) *
        (Number(pkg.heightMm) || 0);
      const pcs = Number(pkg.pieces) || 0;
      if (volPerPieceMm3 < smallMm3) s += pcs;
      else if (volPerPieceMm3 < mediumMm3) m += pcs;
      else if (volPerPieceMm3 < largeMm3) l += pcs;
      else o += pcs;
    }
    return { small: s, medium: m, large: l, oversize: o };
  }, [validationResult, thresholdsM3]);

  const thresholdsCustomized =
    Number(thresholdsM3.small) !== Number(defaultThresholds.small) ||
    Number(thresholdsM3.medium) !== Number(defaultThresholds.medium) ||
    Number(thresholdsM3.large) !== Number(defaultThresholds.large);

  const handleSaveToDatabase = useCallback(async () => {
    if (!validationResult || !validationResult.validated) {
      setError('Validation must pass before saving');
      return;
    }
    if (!columnMapping || Object.keys(columnMapping).length === 0) {
      setError('Column mapping is required before saving');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Persist the size buckets as currently rendered (which may be a client-side override
      // of the backend's defaults) along with the thresholds that produced them. This way a
      // saved manifest carries an audit trail of which thresholds the loadmaster chose.
      const enrichedValidation = {
        ...validationResult,
        statistics: {
          ...validationResult.statistics,
          sizeSmall: sizeBuckets.small,
          sizeMedium: sizeBuckets.medium,
          sizeLarge: sizeBuckets.large,
          sizeOversize: sizeBuckets.oversize,
          sizeThresholdsM3: {
            small: Number(thresholdsM3.small) || 0,
            medium: Number(thresholdsM3.medium) || 0,
            large: Number(thresholdsM3.large) || 0,
          },
        },
      };

      const headers = grid.length > 0 ? grid[0] : [];
      const dataRows = grid.length > 1 ? grid.slice(1) : [];

      const payload = {
        validationResult: enrichedValidation,
        fileName: fileName || `Manifest-${new Date().toISOString().split('T')[0]}`,
        sourceGrid: {
          sheetName: sheetName || 'Sheet1',
          headers,
          rows: dataRows.map((r) => r.slice(0, headers.length)),
        },
        columnMapping,
      };

      console.log('💾 Saving manifest to database...', payload);

      const response = await api.post('/manifests/save', payload);

      console.log('✅ Manifest saved:', response.data);

      setSavedManifest(response.data);
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.error ||
                       err.response?.data?.message ||
                       err.message ||
                       'Failed to save manifest';
      console.error('❌ Save error:', errorMsg);
      setError(`Database save failed: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  }, [validationResult, fileName, sizeBuckets, thresholdsM3, grid, sheetName, columnMapping]);

  const startBlankTable = useCallback(() => {
    setError('');
    setSheetName('');
    setFileName('Untitled (manual)');
    setEditMode(false);
    setGrid(
      Array.from({ length: DEFAULT_ROWS }, () => Array.from({ length: DEFAULT_COLS }, () => '')),
    );
  }, []);

  const parseFile = useCallback((file) => {
    setError('');
    setGrid([]);
    setSheetName('');
    setFileName(file.name);
    setEditMode(false);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls'].includes(ext)) {
      setError('Please choose an Excel file (.xlsx or .xls).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target?.result;
        if (!buf) {
          setError('Could not read file.');
          return;
        }
        const wb = XLSX.read(buf, { type: 'array' });
        const name = wb.SheetNames[0];
        if (!name) {
          setError('Workbook has no sheets.');
          return;
        }
        setSheetName(name);
        const sheet = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const trimmed = rows.slice(0, MAX_IMPORT_ROWS).map((row) =>
          Array.isArray(row)
            ? row.slice(0, MAX_IMPORT_COLS).map((c) => (c === '' ? '' : c))
            : [],
        );
        setGrid(normalizeGrid(trimmed));
      } catch {
        setError('Failed to parse workbook. The file may be corrupted or password-protected.');
      }
    };
    reader.onerror = () => setError('File read failed.');
    reader.readAsArrayBuffer(file);
  }, []);

  const colCount = grid[0]?.length ?? 0;
  const rowCount = grid.length;

  const updateCell = useCallback((ri, ci, value) => {
    setGrid((prev) =>
      prev.map((row, r) => (r === ri ? row.map((cell, i) => (i === ci ? value : cell)) : row)),
    );
  }, []);

  const addRowAfter = useCallback((ri) => {
    setGrid((prev) => {
      const w = prev[0]?.length ?? DEFAULT_COLS;
      const newRow = Array(w).fill('');
      return [...prev.slice(0, ri + 1), newRow, ...prev.slice(ri + 1)];
    });
  }, []);

  const removeRow = useCallback((ri) => {
    setGrid((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== ri);
    });
  }, []);

  const addColumn = useCallback(() => {
    setGrid((prev) => {
      if (!prev.length) return [Array(DEFAULT_COLS).fill('')];
      return prev.map((row) => [...row, '']);
    });
  }, []);

  const removeLastColumn = useCallback(() => {
    setGrid((prev) => {
      if (!prev.length || prev[0].length <= 1) return prev;
      return prev.map((row) => row.slice(0, -1));
    });
  }, []);

  const onChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) parseFile(file);
    },
    [parseFile],
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile],
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div className="cargo-importer-panel">
      <div
        className="border border-2 border-dashed rounded-3 p-4 mb-3 text-center bg-body-secondary bg-opacity-25"
        onDrop={onDrop}
        onDragOver={onDragOver}
        role="presentation"
      >
        <RiFileExcel2Line className="text-primary d-block mb-2 mx-auto" aria-hidden size={56} />
        <p className="mb-2 fw-medium">Drop an Excel manifest here, or browse</p>
        <Form.Control type="file" accept=".xlsx,.xls" onChange={onChange} className="d-none" id="cargo-importer-file" />
        <div className="d-flex flex-wrap justify-content-center gap-2">
          <Button variant="primary" onClick={() => document.getElementById('cargo-importer-file')?.click()}>
            <FaFolderOpen className="me-2" aria-hidden size={16} />
            Choose file
          </Button>
          <Button variant="outline-primary" onClick={startBlankTable}>
            <FaTable className="me-2" aria-hidden size={16} />
            New blank table
          </Button>
        </div>
        {fileName && (
          <div className="small text-muted mt-3 aviation-mono">
            {fileName}
            {sheetName && ` — sheet: ${sheetName}`}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <strong>Error: </strong>{error}
          <div className="small text-muted mt-2">
            <strong>Troubleshooting:</strong>
            <ul className="mb-0 mt-1">
              <li>1. Open the browser console (F12 → Console) and read the error.</li>
              <li>2. Check the request/response in the Network tab.</li>
              <li>3. Confirm the backend is running (terminal shows "Started SmartLoadApplication").</li>
              <li>4. Re-check the column mapping — did you pick the right columns?</li>
            </ul>
          </div>
        </Alert>
      )}

      {grid.length > 0 && (
        <div className="border rounded overflow-hidden">
          <div className="cargo-importer-table-toolbar bg-body-secondary border-bottom px-3 py-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="small text-muted mb-0">
              {editMode
                ? 'Edit mode: cells and rows/columns are editable.'
                : 'Preview mode: click Edit to modify the table.'}
            </span>
            <div className="d-flex align-items-center gap-2 flex-shrink-0">
              <Button variant="outline-secondary" size="sm" onClick={reset}>
                Clear all
              </Button>
              {editMode ? (
                <>
                  <Button variant="outline-secondary" size="sm" onClick={() => setEditMode(false)}>
                    Finish editing
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleCommit}
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Validating…
                      </>
                    ) : (
                      <>
                        <FaCheck className="me-1" aria-hidden size={13} />
                        Validate &amp; Statistics
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setEditMode(true)}>
                  <FaPen className="me-1" aria-hidden size={13} />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {editMode && (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-2 py-2 border-bottom bg-body-tertiary">
              <span className="small text-muted">
                Use the + at the end of a row to add a row, and the + in the header to add a column (import cap: {MAX_IMPORT_ROWS}×{MAX_IMPORT_COLS}; currently {rowCount}×{colCount}).
              </span>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={removeLastColumn}
                disabled={colCount <= 1}
                title="Remove last column"
              >
                <FaMinus className="me-1" aria-hidden size={14} />
                Last column
              </Button>
            </div>
          )}

          <div className="table-responsive">
            <Table size="sm" bordered className="mb-0 small align-middle cargo-importer-table">
              <thead className="table-light">
                <tr>
                  <th className="text-center text-muted" style={{ width: 44 }}>
                    #
                  </th>
                  {Array.from({ length: colCount }, (_, ci) => (
                    <th key={ci} className="text-center text-muted fw-normal aviation-mono">
                      {ci + 1}
                    </th>
                  ))}
                  {editMode && (
                    <th className="text-center p-1" style={{ width: 44 }} title="Add column">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="px-2 py-0 lh-sm"
                        disabled={colCount >= MAX_IMPORT_COLS}
                        onClick={addColumn}
                        aria-label="Add column"
                      >
                        <FaPlus aria-hidden size={14} />
                      </Button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, ri) => (
                  <tr key={ri}>
                    <td className="text-center p-1 bg-body-secondary">
                      <div className="d-flex flex-column align-items-center gap-1">
                        <span className="small text-muted">{ri + 1}</span>
                        {editMode && (
                          <Button
                            variant="link"
                            size="sm"
                            className="text-danger p-0 lh-1"
                            title="Delete row"
                            disabled={rowCount <= 1}
                            onClick={() => removeRow(ri)}
                          >
                            <FaTrash aria-hidden size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                    {row.map((cell, ci) => (
                      <td key={ci} className={editMode ? 'p-0' : 'px-2 py-1'}>
                        {editMode ? (
                          <Form.Control
                            type="text"
                            value={cell}
                            onChange={(e) => updateCell(ri, ci, e.target.value)}
                            className="border-0 rounded-0 shadow-none form-control-sm aviation-mono cargo-importer-cell"
                            aria-label={`Row ${ri + 1}, column ${ci + 1}`}
                          />
                        ) : (
                          <span
                            className="d-block text-truncate aviation-mono cargo-importer-cell-readonly"
                            title={cell}
                          >
                            {cell || '\u00a0'}
                          </span>
                        )}
                      </td>
                    ))}
                    {editMode && (
                      <td className="text-center p-1 align-middle bg-body-secondary" style={{ width: 44 }}>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="px-2 py-0 lh-sm"
                          title="Add a new row below this one"
                          disabled={rowCount >= MAX_IMPORT_ROWS}
                          onClick={() => addRowAfter(ri)}
                          aria-label={`Add a row after row ${ri + 1}`}
                        >
                          <FaPlus aria-hidden size={14} />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Validation Result Preview */}
      {validationResult && (
        <div className="mt-4">
          <div className="border rounded overflow-hidden">
            <div className="bg-body-secondary border-bottom px-3 py-2">
              <h6 className="mb-0">
                {validationResult.validated ? (
                  <>
                    <FaCheck className="text-success me-2" />
                    Validation passed
                  </>
                ) : (
                  <>
                    <FaTimes className="text-danger me-2" />
                    Validation failed
                  </>
                )}
              </h6>
            </div>

            {/* Statistics Cards */}
            {validationResult.statistics && (
              <div className="p-3">
                <div className="row g-2 mb-3">
                  <div className="col-md-3">
                    <div className="card border-0 bg-light">
                      <div className="card-body p-2">
                        <small className="text-muted">Total pieces</small>
                        <h5 className="mb-0">{validationResult.statistics.totalPieces}</h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 bg-light">
                      <div className="card-body p-2">
                        <small className="text-muted">Weight (kg)</small>
                        <h5 className="mb-0">{validationResult.statistics.totalWeightKg?.toFixed(1)}</h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 bg-light">
                      <div className="card-body p-2">
                        <small className="text-muted">Volume</small>
                        <h5 className="mb-0">{(validationResult.statistics.totalVolumeMm3 / 1_000_000_000)?.toFixed(2)} m³</h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 bg-light">
                      <div className="card-body p-2">
                        <small className="text-muted">Capacity vs B777F</small>
                        <h5 className={`mb-0 ${validationResult.statistics.capacityPercentage > 100 ? 'text-danger' : ''}`}>
                          {validationResult.statistics.capacityPercentage?.toFixed(1)}%
                        </h5>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Average density — single-row banner with a verbal band */}
                {validationResult.statistics.averageDensity != null && (
                  <div className="mb-3 p-2 bg-light rounded d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div>
                      <small className="text-muted">Average density</small>
                      <div>
                        <strong className="fs-6">
                          {validationResult.statistics.averageDensity.toFixed(1)}
                        </strong>{' '}
                        <small className="text-muted">kg/m³</small>
                      </div>
                    </div>
                    <span className={`badge bg-${densityBand(validationResult.statistics.averageDensity).variant}`}>
                      {densityBand(validationResult.statistics.averageDensity).label}
                    </span>
                  </div>
                )}

                <hr className="my-2" />

                {/* Destination Breakdown */}
                {validationResult.statistics.destinationBreakdown && Object.keys(validationResult.statistics.destinationBreakdown).length > 0 && (
                  <div className="mb-3">
                    <small className="fw-bold">Destination breakdown</small>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {Object.entries(validationResult.statistics.destinationBreakdown).map(([dest, count]) => (
                        <span key={dest} className="badge bg-info">{dest}: {count}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Handling Codes — only shown when the manifest actually has SHC entries.
                    DG is highlighted in red because it drives Faz 3 segregation rules. */}
                {validationResult.statistics.specialHandlingBreakdown &&
                  Object.keys(validationResult.statistics.specialHandlingBreakdown).length > 0 && (
                    <div className="mb-3">
                      <small className="fw-bold">Special handling codes</small>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        {Object.entries(validationResult.statistics.specialHandlingBreakdown).map(([code, count]) => (
                          <span key={code} className={`badge bg-${shcBadgeVariant(code)}`}>
                            {code}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Size Distribution — thresholds are user-adjustable; recompute is client-side */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="fw-bold">
                      Size distribution
                      {thresholdsCustomized && (
                        <span className="ms-2 badge bg-info text-dark fw-normal">customized</span>
                      )}
                    </small>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 text-decoration-none"
                      onClick={() => setEditingThresholds((v) => !v)}
                    >
                      {editingThresholds ? 'Close' : 'Edit thresholds'}
                    </Button>
                  </div>

                  {editingThresholds && (
                    <div className="border rounded p-2 mt-2 mb-2 bg-light">
                      <div className="row g-2 align-items-end">
                        <div className="col-12 col-md">
                          <label className="form-label small mb-1">Small &lt;</label>
                          <div className="input-group input-group-sm">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              className="form-control"
                              value={thresholdsM3.small}
                              onChange={(e) =>
                                setThresholdsM3((t) => ({
                                  ...t,
                                  small: e.target.value === '' ? 0 : parseFloat(e.target.value),
                                }))
                              }
                              aria-label="Small upper bound (m³)"
                            />
                            <span className="input-group-text">m³</span>
                          </div>
                        </div>
                        <div className="col-12 col-md">
                          <label className="form-label small mb-1">Medium &lt;</label>
                          <div className="input-group input-group-sm">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              className="form-control"
                              value={thresholdsM3.medium}
                              onChange={(e) =>
                                setThresholdsM3((t) => ({
                                  ...t,
                                  medium: e.target.value === '' ? 0 : parseFloat(e.target.value),
                                }))
                              }
                              aria-label="Medium upper bound (m³)"
                            />
                            <span className="input-group-text">m³</span>
                          </div>
                        </div>
                        <div className="col-12 col-md">
                          <label className="form-label small mb-1">Large &lt;</label>
                          <div className="input-group input-group-sm">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              className="form-control"
                              value={thresholdsM3.large}
                              onChange={(e) =>
                                setThresholdsM3((t) => ({
                                  ...t,
                                  large: e.target.value === '' ? 0 : parseFloat(e.target.value),
                                }))
                              }
                              aria-label="Large upper bound (m³)"
                            />
                            <span className="input-group-text">m³</span>
                          </div>
                        </div>
                        <div className="col-12 col-md-auto">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setThresholdsM3(defaultThresholds)}
                            disabled={!thresholdsCustomized}
                          >
                            Reset to defaults
                          </Button>
                        </div>
                      </div>
                      <small className="text-muted d-block mt-2">
                        Thresholds apply to a single piece's volume (L×W×H). Oversize = anything above the Large threshold.
                        Defaults are ULD-oriented (LD3 ≈ 1.5 m³, PMC pallet ≈ 4 m³).
                      </small>
                    </div>
                  )}

                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <span className="badge bg-secondary">Small: {sizeBuckets.small}</span>
                    <span className="badge bg-secondary">Medium: {sizeBuckets.medium}</span>
                    <span className="badge bg-secondary">Large: {sizeBuckets.large}</span>
                    <span className="badge bg-secondary">Oversize: {sizeBuckets.oversize}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error List */}
            {validationResult.issues && validationResult.issues.length > 0 && (
              <div className="p-3 border-top bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="fw-bold">
                    Validation issues ({validationResult.issues.length})
                  </small>
                  <small className="text-muted">
                    ERROR: {validationResult.issues.filter(i => i.severity === 'ERROR').length} |
                    WARNING: {validationResult.issues.filter(i => i.severity === 'WARNING').length}
                  </small>
                </div>
                <div className="list-group list-group-sm mt-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {validationResult.issues.slice(0, 20).map((issue, idx) => (
                    <div key={idx} className={`list-group-item py-2 px-2 border-0 small ${issue.severity === 'ERROR' ? 'bg-danger-light' : 'bg-warning-light'}`}>
                      <div className="d-flex gap-2">
                        <span className="badge" style={{
                          backgroundColor: issue.severity === 'ERROR' ? '#dc3545' : '#ffc107',
                          color: issue.severity === 'ERROR' ? 'white' : 'black',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                          Row {issue.rowNumber}
                        </span>
                        <div className="flex-grow-1">
                          <strong>{issue.columnName}</strong>: {issue.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {validationResult.issues.length > 20 && (
                  <div className="mt-2 text-muted">
                    <small>… {validationResult.issues.length - 20} more issues</small>
                  </div>
                )}
              </div>
            )}

            {/* Save Success Message */}
            {savedManifest && (
              <div className="p-3 border-top bg-success-light border-success">
                <div className="d-flex align-items-center gap-2">
                  <FaCheck className="text-success" size={18} />
                  <div>
                    <strong>Saved successfully</strong>
                    <div className="small text-muted mt-1">
                      Manifest ID: <code>{savedManifest.id}</code>
                      <br />
                      File: {savedManifest.fileName}
                      <br />
                      Pieces: {savedManifest.totalPieces} | Weight: {savedManifest.totalWeightKg?.toFixed(1)} kg
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-3 border-top d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  setValidationResult(null);
                  setSavedManifest(null);
                }}
              >
                Back to edit
              </Button>
              {validationResult.validated && !savedManifest && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleSaveToDatabase}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <FaCheck className="me-1" size={13} />
                      Save to database
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Column Mapping Dialog */}
      {showMappingDialog && (
        <ColumnMappingDialog
          headers={grid.length > 0 ? grid[0] : []}
          onConfirm={handleMappingConfirmed}
          onCancel={() => setShowMappingDialog(false)}
        />
      )}
    </div>
  );
}
