import { useCallback, useState } from 'react';
import { Alert, Button, Form, Table } from 'react-bootstrap';
import * as XLSX from 'xlsx';

const PREVIEW_ROWS = 12;
const PREVIEW_COLS = 10;

/**
 * Client-side Excel ingest: pick file, parse first sheet, show grid preview.
 * Backend upload wiring comes in a later phase.
 */
export default function CargoImporterPanel() {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [grid, setGrid] = useState(/** @type {(string|number|null)[][]} */ ([]));

  const reset = useCallback(() => {
    setFileName('');
    setError('');
    setSheetName('');
    setGrid([]);
  }, []);

  const parseFile = useCallback((file) => {
    setError('');
    setGrid([]);
    setSheetName('');
    setFileName(file.name);

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
        const trimmed = rows
          .slice(0, PREVIEW_ROWS)
          .map((row) =>
            Array.isArray(row)
              ? row.slice(0, PREVIEW_COLS).map((c) => (c === '' ? null : c))
              : [],
          );
        setGrid(trimmed);
      } catch {
        setError('Failed to parse workbook. The file may be corrupted or password-protected.');
      }
    };
    reader.onerror = () => setError('File read failed.');
    reader.readAsArrayBuffer(file);
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
        <i className="bi bi-file-earmark-spreadsheet display-6 text-primary d-block mb-2" />
        <p className="mb-2 fw-medium">Drop an Excel manifest here, or browse</p>
        <Form.Control type="file" accept=".xlsx,.xls" onChange={onChange} className="d-none" id="cargo-importer-file" />
        <Button variant="primary" onClick={() => document.getElementById('cargo-importer-file')?.click()}>
          <i className="bi bi-folder2-open me-2" />
          Choose file
        </Button>
        {fileName && (
          <div className="small text-muted mt-3 aviation-mono">
            Selected: {fileName}
            {sheetName && ` — sheet: ${sheetName}`}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {grid.length > 0 && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="small text-muted">
              Preview (first {PREVIEW_ROWS} rows × {PREVIEW_COLS} columns). Server import is not wired yet.
            </span>
            <Button variant="outline-secondary" size="sm" onClick={reset}>
              Clear
            </Button>
          </div>
          <div className="table-responsive border rounded">
            <Table size="sm" striped bordered hover className="mb-0 small aviation-mono">
              <tbody>
                {grid.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="text-nowrap text-truncate" style={{ maxWidth: 160 }} title={String(cell ?? '')}>
                        {cell ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
