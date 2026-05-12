import { useCallback, useState } from 'react';
import { Alert, Button, Form, Table } from 'react-bootstrap';
import { FaFolderOpen, FaMinus, FaPen, FaPlus, FaTable, FaTrash } from 'react-icons/fa';
import { RiFileExcel2Line } from 'react-icons/ri';
import * as XLSX from 'xlsx';

/** Max rows read from Excel on first import (full sheets can be huge). */
const MAX_IMPORT_ROWS = 150;
/** Max columns read from Excel on first import. */
const MAX_IMPORT_COLS = 24;
const DEFAULT_COLS = 6;
const DEFAULT_ROWS = 4;

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
 * Excel ingest + grid: read-only until user clicks Düzenle; then cells and row/column tools work (client-side only).
 */
export default function CargoImporterPanel() {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [grid, setGrid] = useState(/** @type {string[][]} */ ([]));
  const [editMode, setEditMode] = useState(false);

  const reset = useCallback(() => {
    setFileName('');
    setError('');
    setSheetName('');
    setGrid([]);
    setEditMode(false);
  }, []);

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
          {error}
        </Alert>
      )}

      {grid.length > 0 && (
        <div className="border rounded overflow-hidden">
          <div className="cargo-importer-table-toolbar bg-body-secondary border-bottom px-3 py-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="small text-muted mb-0">
              {editMode
                ? 'Düzenleme modu: hücreleri ve satır/sütunları değiştirebilirsiniz.'
                : 'Önizleme modu: tabloyu değiştirmek için Düzenle butonuna basın.'}
            </span>
            <div className="d-flex align-items-center gap-2 flex-shrink-0">
              <Button variant="outline-secondary" size="sm" onClick={reset}>
                Tümünü temizle
              </Button>
              {editMode ? (
                <Button variant="outline-secondary" size="sm" onClick={() => setEditMode(false)}>
                  Düzenlemeyi bitir
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setEditMode(true)}>
                  <FaPen className="me-1" aria-hidden size={13} />
                  Düzenle
                </Button>
              )}
            </div>
          </div>

          {editMode && (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-2 py-2 border-bottom bg-body-tertiary">
              <span className="small text-muted">
                Satır eklemek için satır sonundaki +, sütun eklemek için başlıktaki + kullanın (en fazla {MAX_IMPORT_ROWS}×{MAX_IMPORT_COLS} içe aktarım; şu an {rowCount}×{colCount}).
              </span>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={removeLastColumn}
                disabled={colCount <= 1}
                title="Son sütunu kaldır"
              >
                <FaMinus className="me-1" aria-hidden size={14} />
                Son sütun
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
                    <th className="text-center p-1" style={{ width: 44 }} title="Sütun ekle">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="px-2 py-0 lh-sm"
                        disabled={colCount >= MAX_IMPORT_COLS}
                        onClick={addColumn}
                        aria-label="Sütun ekle"
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
                            title="Satırı sil"
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
                            aria-label={`Satır ${ri + 1}, sütun ${ci + 1}`}
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
                          title="Bu satırdan sonra yeni satır ekle"
                          disabled={rowCount >= MAX_IMPORT_ROWS}
                          onClick={() => addRowAfter(ri)}
                          aria-label={`Satır ${ri + 1} sonrasına satır ekle`}
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
    </div>
  );
}
