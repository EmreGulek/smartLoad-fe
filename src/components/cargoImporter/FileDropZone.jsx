import { useCallback, useRef, useState } from 'react';
import { Alert, Badge, Button, Card } from 'react-bootstrap';
import { FaFolderOpen, FaTimes } from 'react-icons/fa';
import { RiFileExcel2Line } from 'react-icons/ri';
import * as XLSX from 'xlsx';

/**
 * Step 1 of the cargo import flow — File select.
 *
 * Responsibility:
 *  - Let the user pick an .xlsx file (drag-drop OR file picker).
 *  - Validate extension + size.
 *  - Light-parse the workbook (sheet names only — no row content) to
 *    surface file name, size, and the list of worksheets.
 *  - Expose the parsed metadata + the ArrayBuffer to the parent so
 *    later steps (sheet picker, full parse via Web Worker) can reuse them.
 *
 * Out of scope (will live in later steps):
 *  - Reading row content (Step 3 — Web Worker).
 *  - Column mapping (Step 4).
 *  - Validation + stats (Steps 5-6).
 *  - Backend persistence (Step 8).
 */

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * @param {{
 *   onSelect?: (info: { file: File; fileName: string; sheetNames: string[]; buffer: ArrayBuffer }) => void
 *   onClear?: () => void
 * }} props
 */
export default function FileDropZone({ onSelect, onClear }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setSheetNames([]);
    setError('');
    setBusy(false);
    onClear?.();
  }, [onClear]);

  const handleFile = useCallback(
    async (picked) => {
      setError('');

      const ext = picked.name.split('.').pop()?.toLowerCase();
      if (!ext || !['xlsx', 'xls'].includes(ext)) {
        setError('Please choose an Excel file (.xlsx or .xls).');
        return;
      }

      if (picked.size > MAX_FILE_BYTES) {
        setError(
          `File too large (${formatBytes(picked.size)}). Maximum is ${formatBytes(MAX_FILE_BYTES)}.`,
        );
        return;
      }

      setBusy(true);
      try {
        const buffer = await picked.arrayBuffer();
        // Light parse — read only the sheet names. No row content here;
        // full parsing is the next step's job (off the main thread).
        const wb = XLSX.read(buffer, { type: 'array', bookSheets: true });
        const names = Array.isArray(wb.SheetNames) ? wb.SheetNames : [];

        if (!names.length) {
          setError('Workbook has no sheets.');
          return;
        }

        setFile(picked);
        setSheetNames(names);
        onSelect?.({ file: picked, fileName: picked.name, sheetNames: names, buffer });
      } catch (err) {
        const msg = err?.message ? String(err.message) : 'Unknown error';
        setError(`Failed to read workbook: ${msg}`);
      } finally {
        setBusy(false);
      }
    },
    [onSelect],
  );

  const onChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) handleFile(f);
  };

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOver) setDragOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  if (file) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div className="d-flex align-items-start gap-3 flex-grow-1 min-w-0">
              <RiFileExcel2Line className="text-success flex-shrink-0" size={42} aria-hidden />
              <div className="flex-grow-1 min-w-0">
                <div
                  className="fw-medium aviation-mono text-truncate"
                  title={file.name}
                  style={{ maxWidth: 420 }}
                >
                  {file.name}
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
                  <Badge bg="light" text="dark">
                    {formatBytes(file.size)}
                  </Badge>
                  <Badge bg="info">
                    {sheetNames.length} sheet{sheetNames.length === 1 ? '' : 's'}
                  </Badge>
                  {sheetNames.slice(0, 3).map((name) => (
                    <Badge key={name} bg="secondary" className="aviation-mono">
                      {name}
                    </Badge>
                  ))}
                  {sheetNames.length > 3 && (
                    <span className="text-muted small">+{sheetNames.length - 3} more</span>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline-secondary" size="sm" onClick={reset}>
              <FaTimes className="me-1" size={12} aria-hidden />
              Clear
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card
        className={`shadow-sm ${dragOver ? 'border-primary border-2' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !busy && inputRef.current?.click()}
        style={{ transition: 'border-color 0.15s', cursor: busy ? 'wait' : 'pointer' }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !busy) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <Card.Body className="text-center py-5">
          <RiFileExcel2Line
            className={`d-block mx-auto mb-3 ${dragOver ? 'text-primary' : 'text-secondary'}`}
            size={64}
            aria-hidden
          />
          <h6 className="mb-1">
            {dragOver ? 'Drop the file here' : 'Drop an Excel manifest here, or click to browse'}
          </h6>
          <p className="text-muted small mb-3">
            Accepted: .xlsx, .xls — up to {formatBytes(MAX_FILE_BYTES)}
          </p>
          <Button
            variant="primary"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            <FaFolderOpen className="me-2" size={14} aria-hidden />
            {busy ? 'Reading…' : 'Choose file'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="d-none"
            onChange={onChange}
            disabled={busy}
          />
        </Card.Body>
      </Card>

      {error && (
        <Alert
          variant="danger"
          className="mt-3 mb-0"
          dismissible
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
    </>
  );
}
