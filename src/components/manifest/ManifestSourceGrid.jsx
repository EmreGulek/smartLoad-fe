import { Table } from 'react-bootstrap';

/**
 * Read-only Excel grid (immutable source_grid). Not editable — edits belong on packages.
 */
export default function ManifestSourceGrid({ headers = [], rows = [], highlightRowNumbers = null }) {
  const colCount = Math.max(headers.length, ...rows.map((r) => (Array.isArray(r) ? r.length : 0)), 0);
  const highlightSet =
    highlightRowNumbers instanceof Set
      ? highlightRowNumbers
      : new Set(Array.isArray(highlightRowNumbers) ? highlightRowNumbers : []);

  if (colCount === 0) {
    return <div className="text-muted small p-3">No source grid stored for this manifest.</div>;
  }

  return (
    <div className="manifest-source-grid-scroll table-responsive">
      <Table size="sm" bordered className="mb-0 small align-middle cargo-importer-table manifest-source-grid-table">
        <thead className="table-light">
          <tr>
            <th className="text-center text-muted" style={{ width: 52 }}>
              Excel #
            </th>
            {Array.from({ length: colCount }, (_, ci) => (
              <th key={ci} className="aviation-mono fw-normal">
                {headers[ci] != null && String(headers[ci]).trim() !== ''
                  ? String(headers[ci])
                  : `Col ${ci + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const excelRow = ri + 2;
            const highlighted = highlightSet.has(excelRow);
            return (
              <tr key={ri} className={highlighted ? 'table-warning' : undefined}>
                <td className="text-center text-muted aviation-mono">{excelRow}</td>
                {Array.from({ length: colCount }, (_, ci) => (
                  <td key={ci} className="aviation-mono">
                    {row?.[ci] != null && row[ci] !== '' ? String(row[ci]) : ''}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
