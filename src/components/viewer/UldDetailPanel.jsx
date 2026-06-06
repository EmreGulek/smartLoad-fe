/**
 * UldDetailPanel — slide-in right panel showing the internals of one ULD.
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │ Header: positionCode + type  │
 *   ├──────────────────────────────┤
 *   │ UldDetailViewer (3D canvas)  │  ← 340px tall
 *   ├──────────────────────────────┤
 *   │ Stats row                    │
 *   ├──────────────────────────────┤
 *   │ Package list table           │
 *   └──────────────────────────────┘
 */

import UldDetailViewer from './UldDetailViewer';

const DEST_COLORS = {};
function destHex(dest) {
  if (!dest) return '#888888';
  if (DEST_COLORS[dest]) return DEST_COLORS[dest];
  let h = 0;
  for (let i = 0; i < dest.length; i++) h = (Math.imul(31, h) + dest.charCodeAt(i)) | 0;
  const hex = '#' + (Math.abs(h) % 0xffffff).toString(16).padStart(6, '0');
  DEST_COLORS[dest] = hex;
  return hex;
}

const ROT_LABELS = ['W×H×L', 'L×H×W', 'W×L×H', 'L×W×H', 'H×W×L', 'H×L×W'];

export default function UldDetailPanel({ assignment, onClose, inline = false }) {
  if (!assignment) return null;

  const { positionCode, uldTypeCode, uldTypeName, colorHex,
          totalWeightKg, utilizationPct, packageCount, placements } = assignment;

  // inline=true → fill parent container (used in table detail card)
  // inline=false → absolute overlay on the right side of the viewer
  const containerStyle = inline
    ? { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f1117' }
    : {
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 420,
      background: '#0f1117',
      borderLeft: '1px solid #2a2d3a',
      display: 'flex', flexDirection: 'column',
      zIndex: 20,
      fontFamily: 'monospace',
      color: '#e0e0e0',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
    };

  return (
    <div style={{ ...containerStyle, fontFamily: 'monospace', color: '#e0e0e0' }}>

      {/* ── Header (overlay mode only) ── */}
      {!inline && (
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid #2a2d3a',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            background: colorHex, color: '#fff', fontWeight: 'bold',
            padding: '3px 10px', borderRadius: 4, fontSize: 13,
          }}>
            {positionCode}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#fff' }}>{uldTypeName}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              {packageCount} packages · {totalWeightKg?.toFixed(1)} kg · {utilizationPct?.toFixed(1)}% full
            </div>
          </div>
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: '#888', fontSize: 18, cursor: 'pointer', padding: '0 4px',
            lineHeight: 1,
          }}>✕</button>
        </div>
      )}

      {/* ── Body: inline = side-by-side, overlay = stacked ── */}
      <div style={{
        display: 'flex',
        flexDirection: inline ? 'row' : 'column',
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* 3D Viewer */}
        <div style={{
          height: inline ? '100%' : 300,
          width: inline ? '55%' : '100%',
          flexShrink: 0,
          position: 'relative',
          borderRight: inline ? '1px solid #2a2d3a' : 'none',
        }}>
          {placements.length === 0
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                            height: '100%', color: '#555', fontSize: 13 }}>
                No packages placed in this ULD
              </div>
            : <UldDetailViewer assignment={assignment} />
          }
        </div>

        {/* Right side: stats + list */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

      {/* ── Stats bar ── */}
      <div style={{
        display: 'flex', gap: 0,
        borderTop: '1px solid #2a2d3a', borderBottom: '1px solid #2a2d3a',
        flexShrink: 0,
      }}>
        {[
          { label: 'Packages', value: packageCount },
          { label: 'Weight', value: `${totalWeightKg?.toFixed(1)} kg` },
          { label: 'Fill', value: `${utilizationPct?.toFixed(1)}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: 1, padding: '8px 12px', textAlign: 'center',
            borderRight: '1px solid #2a2d3a',
          }}>
            <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#e0e0e0', marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Package list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 80px 64px',
          padding: '4px 12px 4px',
          fontSize: 10, color: '#555', textTransform: 'uppercase',
          borderBottom: '1px solid #1a1d27',
        }}>
          <span>#</span>
          <span>Destination</span>
          <span>Dims (mm)</span>
          <span>Wt (kg)</span>
        </div>

        {placements.map((p, idx) => {
          const color = destHex(p.destinationCode);
          return (
            <div key={p.id} style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 80px 64px',
              padding: '5px 12px',
              fontSize: 11,
              borderBottom: '1px solid #1a1d27',
              alignItems: 'center',
            }}>
              <span style={{ color: '#555' }}>{idx + 1}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: color, flexShrink: 0, display: 'inline-block',
                }} />
                <span style={{ color: '#ccc', fontFamily: 'monospace' }}>
                  {p.destinationCode || '—'}
                </span>
                {p.dgClass && (
                  <span style={{ fontSize: 9, background: '#c0392b', color: '#fff',
                                 padding: '1px 4px', borderRadius: 2, marginLeft: 2 }}>
                    DG {p.dgClass}
                  </span>
                )}
                {p.specialHandling && p.specialHandling !== 'GEN' && (
                  <span style={{ fontSize: 9, background: '#2c3e50', color: '#aaa',
                                 padding: '1px 4px', borderRadius: 2 }}>
                    {p.specialHandling}
                  </span>
                )}
              </span>
              <span style={{ color: '#888', fontSize: 10 }}>
                {p.appliedWidthMm}×{p.appliedHeightMm}×{p.appliedDepthMm}
              </span>
              <span style={{ color: '#888' }}>
                {p.grossWeightKg?.toFixed(1)}
              </span>
            </div>
          );
        })}

        {placements.length === 0 && (
          <div style={{ padding: '20px 12px', color: '#555', fontSize: 12, textAlign: 'center' }}>
            This position has no packages assigned.
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{
        padding: '8px 12px', borderTop: '1px solid #2a2d3a',
        fontSize: 10, color: '#555',
      }}>
        Colour = destination · Rotate: drag · Zoom: scroll
      </div>
        </div> {/* end right column */}
      </div>   {/* end body flex */}
    </div>
  );
}
