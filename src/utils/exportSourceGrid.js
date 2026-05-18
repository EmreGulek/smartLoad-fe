import * as XLSX from 'xlsx';

/**
 * Rebuild an .xlsx from immutable source_grid (not the original binary file).
 * Label downloads accordingly in the UI.
 */
export function downloadSourceGridAsXlsx({ headers, rows, sheetName, fileName }) {
  const aoa = [];
  if (headers?.length) {
    aoa.push(headers.map((h) => (h != null ? h : '')));
  }
  for (const row of rows || []) {
    aoa.push((row || []).map((c) => (c != null ? c : '')));
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
  const outName = fileName?.endsWith('.xlsx') ? fileName : `${fileName || 'manifest'}.xlsx`;
  XLSX.writeFile(wb, outName);
}
