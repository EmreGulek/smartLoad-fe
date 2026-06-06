/**
 * UldDetailViewer — isolated 3D canvas showing one ULD with its packages.
 *
 * Receives a UldAssignmentDto and renders:
 *   - The ULD contour shell (semi-transparent)
 *   - Each package as a coloured box at its exact x/y/z coordinates
 *   - Camera positioned from the front-right at a comfortable angle
 *
 * Coordinate system (ULD-local, metres):
 *   x = lateral  (0 = left wall)
 *   y = vertical (0 = floor)
 *   z = depth    (0 = front face)
 *   All DB values are mm → divide by 1000.
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { parseContourPoints, uldLengthM } from '../../utils/aircraftCoords';

// ── colour helpers ────────────────────────────────────────────────────────────

function destColor(dest) {
  if (!dest) return 0x888888;
  let h = 0;
  for (let i = 0; i < dest.length; i++) h = (Math.imul(31, h) + dest.charCodeAt(i)) | 0;
  return Math.abs(h) % 0xffffff;
}

// ── ULD shell ─────────────────────────────────────────────────────────────────

function UldShell({ contourPointsJson, lengthMm, colorHex }) {
  const pointsM = useMemo(() => parseContourPoints(contourPointsJson), [contourPointsJson]);
  const lengthM = uldLengthM(lengthMm);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(pointsM[0][0], pointsM[0][1]);
    for (let i = 1; i < pointsM.length; i++) shape.lineTo(pointsM[i][0], pointsM[i][1]);
    shape.lineTo(pointsM[0][0], pointsM[0][1]);
    const g = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: lengthM, bevelEnabled: false });
    g.center();
    return g;
  }, [pointsM, lengthM]);

  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
  const colorInt  = useMemo(() => parseInt(colorHex.replace('#', ''), 16), [colorHex]);

  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={colorInt} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial color={colorInt} transparent opacity={0.6} />
      </lineSegments>
    </>
  );
}

// ── Package boxes ─────────────────────────────────────────────────────────────

function PackageBox({ placement, bboxWMm, bboxHMm, lengthMm }) {
  const { xMm, yMm, zMm, appliedWidthMm, appliedHeightMm, appliedDepthMm, destinationCode } = placement;

  // Centre of package in ULD-local mm → offset from ULD bbox centre
  const cx = xMm + appliedWidthMm  / 2;
  const cy = yMm + appliedHeightMm / 2;
  const cz = zMm + appliedDepthMm  / 2;

  const ox = (cx - bboxWMm  / 2) / 1000;
  const oy = (cy - bboxHMm  / 2) / 1000;
  const oz = (cz - lengthMm / 2) / 1000;

  const w = appliedWidthMm  / 1000 - 0.01;
  const h = appliedHeightMm / 1000 - 0.01;
  const d = appliedDepthMm  / 1000 - 0.01;

  const color = destColor(destinationCode);

  return (
    <mesh position={[ox, oy, oz]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} metalness={0.05} roughness={0.75} transparent opacity={0.92} />
    </mesh>
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────────

function UldScene({ assignment }) {
  const { contourPointsJson, lengthMm, colorHex, bboxWMm, bboxHMm, placements } = assignment;

  // Camera target: centre of ULD bbox in metres
  const W = bboxWMm  / 1000;
  const H = bboxHMm  / 1000;
  const L = lengthMm / 1000;
  const maxDim = Math.max(W, H, L);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[maxDim * 2, maxDim * 2, maxDim * 2]} intensity={0.9} />
      <directionalLight position={[-maxDim, maxDim, -maxDim]} intensity={0.4} />

      <UldShell contourPointsJson={contourPointsJson} lengthMm={lengthMm} colorHex={colorHex} />

      {placements.map(p => (
        <PackageBox
          key={p.id}
          placement={p}
          bboxWMm={bboxWMm}
          bboxHMm={bboxHMm}
          lengthMm={lengthMm}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
      />
    </>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function UldDetailViewer({ assignment }) {
  if (!assignment) return null;

  // Camera distance: 2× max dimension
  const W = assignment.bboxWMm  / 1000;
  const H = assignment.bboxHMm  / 1000;
  const L = assignment.lengthMm / 1000;
  const d = Math.max(W, H, L) * 2.2;

  return (
    <Canvas
      camera={{ position: [d * 0.8, d * 0.6, d * 1.2], fov: 45, near: 0.01, far: 100 }}
      style={{ background: '#0d0d1a', width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <UldScene assignment={assignment} />
    </Canvas>
  );
}
