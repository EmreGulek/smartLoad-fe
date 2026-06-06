/**
 * B777FViewer — Phase 3: DB-driven 3D cargo viewer with package placement.
 *
 * Fetches aircraft geometry + ULD positions from the backend on mount.
 * Optional loadPlan prop: when provided, renders package boxes inside ULDs.
 *
 * Coordinate conversion: utils/aircraftCoords.js (ADR-0012).
 *
 * Architecture:
 *   B777FViewer           — data fetching + loading/error states
 *   └─ AircraftScene      — receives aircraft + positions + optional loadPlan
 *      ├─ FuselageHull    — wireframe fuselage cylinder
 *      ├─ CargoLayout     — maps positions → ULD groups
 *      │   ├─ UldShell    — extruded contour (semi-transparent when packages visible)
 *      │   └─ PackageBoxes — coloured package boxes (only when loadPlan provided)
 *      └─ OrbitControls
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { fetchAircraftConfig } from '../../services/api';
import {
  parseContourPoints,
  positionToScene,
  uldLengthM,
} from '../../utils/aircraftCoords';

// ── B777F aircraft id in DB (seeded by DataInitializer) ──────────────────────
const B777F_AIRCRAFT_ID = 1;

// ── PackageBoxes ──────────────────────────────────────────────────────────────

/**
 * Hash a destination code string to a stable hex colour integer.
 * Used to colour-code packages by destination in the 3D viewer.
 */
function destColor(dest) {
  if (!dest) return 0x888888;
  let h = 0;
  for (let i = 0; i < dest.length; i++) h = (Math.imul(31, h) + dest.charCodeAt(i)) | 0;
  return Math.abs(h) % 0xffffff;
}

/**
 * Renders all package placements inside a single ULD assignment as
 * small semi-transparent boxes, colour-coded by destination.
 *
 * Package position in ULD-local coordinates (mm, origin bottom-front-left):
 *   Three.js offset from ULD centre = (pkg_center - bbox_center) / 1000
 *
 * @param {object} assignment  - UldAssignmentDto
 * @param {boolean} mirror     - true for port-side ULDs
 */
function PackageBoxes({ assignment, mirror }) {
  const { bboxWMm, bboxHMm, lengthMm, placements } = assignment;

  return (
    <>
      {placements.map((p) => {
        // Centre of package in ULD-local mm
        const cx = p.xMm + p.appliedWidthMm  / 2;
        const cy = p.yMm + p.appliedHeightMm / 2;
        const cz = p.zMm + p.appliedDepthMm  / 2;

        // Offset from ULD bounding-box centre (the geom.center() anchor)
        const ox = ((cx - bboxWMm  / 2) / 1000) * (mirror ? -1 : 1);
        const oy =  (cy - bboxHMm  / 2) / 1000;
        const oz =  (cz - lengthMm / 2) / 1000;

        const w = p.appliedWidthMm  / 1000;
        const h = p.appliedHeightMm / 1000;
        const d = p.appliedDepthMm  / 1000;

        const color = destColor(p.destinationCode);

        return (
          <mesh key={p.id} position={[ox, oy, oz]}>
            <boxGeometry args={[w - 0.01, h - 0.01, d - 0.01]} />
            <meshStandardMaterial
              color={color}
              metalness={0.0}
              roughness={0.8}
              transparent
              opacity={0.85}
            />
          </mesh>
        );
      })}
    </>
  );
}

// ── CargoLayout ───────────────────────────────────────────────────────────────

/**
 * Renders all positions returned by the API.
 * When a loadPlan is provided, also renders package boxes inside each ULD.
 *
 * Mirror logic: positions with negative lateralOffsetMm are on the port side.
 * The UldMesh mirrors the geometry so the contour faces inward correctly.
 */
function CargoLayout({ aircraft, positions, loadPlan, selectedPositionCode, onUldClick }) {
  // Build a map of positionCode → assignment for fast lookup
  const assignmentMap = useMemo(() => {
    if (!loadPlan) return {};
    return Object.fromEntries(loadPlan.assignments.map(a => [a.positionCode, a]));
  }, [loadPlan]);

  return (
    <group>
      {positions.map((pos) => {
        const sceneCoords  = positionToScene(pos, aircraft);
        const mirror       = pos.lateralOffsetMm < 0;
        const assignment   = assignmentMap[pos.positionCode];
        const isSelected   = selectedPositionCode === pos.positionCode;

        return (
          <group
            key={pos.id}
            position={[sceneCoords.x, sceneCoords.y, sceneCoords.z]}
            scale={mirror ? [-1, 1, 1] : [1, 1, 1]}
            onClick={(e) => {
              e.stopPropagation();
              if (onUldClick) onUldClick(pos.positionCode, assignment || null);
            }}
          >
            {/* ULD contour shell — brighter when selected */}
            <UldShell uldType={pos.uldType} selected={isSelected} />
            {/* Package boxes (only when load plan loaded) */}
            {assignment && assignment.placements.length > 0 && (
              <PackageBoxes assignment={assignment} mirror={false} />
            )}
          </group>
        );
      })}
    </group>
  );
}

/**
 * ULD contour shell — extracted from UldMesh so the group/scale logic
 * can be handled by CargoLayout directly.
 */
function UldShell({ uldType, selected = false }) {
  const pointsM = useMemo(
    () => parseContourPoints(uldType.pointsJson),
    [uldType.pointsJson],
  );
  const lengthM = uldLengthM(uldType.lengthMm);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(pointsM[0][0], pointsM[0][1]);
    for (let i = 1; i < pointsM.length; i++) shape.lineTo(pointsM[i][0], pointsM[i][1]);
    shape.lineTo(pointsM[0][0], pointsM[0][1]);
    const geom = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: lengthM, bevelEnabled: false });
    geom.center();
    return geom;
  }, [pointsM, lengthM]);

  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
  const colorInt  = useMemo(() => parseInt(uldType.colorHex.replace('#', ''), 16), [uldType.colorHex]);

  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={colorInt}
          metalness={0.15}
          roughness={0.55}
          transparent
          opacity={selected ? 0.55 : 0.25}
          side={THREE.DoubleSide}
          emissive={selected ? colorInt : 0x000000}
          emissiveIntensity={selected ? 0.3 : 0}
        />
      </mesh>
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial color={selected ? colorInt : 0x495057} transparent opacity={selected ? 0.9 : 0.25} />
      </lineSegments>
    </>
  );
}

// ── FuselageHull ──────────────────────────────────────────────────────────────

function FuselageHull({ fuselageRadiusM }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[fuselageRadiusM, fuselageRadiusM, 60, 64, 1, true]} />
      <meshBasicMaterial
        color={0xadb5bd}
        wireframe
        transparent
        opacity={0.18}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── AircraftScene ─────────────────────────────────────────────────────────────

function AircraftScene({ aircraft, positions, loadPlan, selectedPositionCode, onUldClick }) {
  const fuselageRadiusM = aircraft.fuselageRadiusMm * 0.001;
  const floorMainDeckM  = aircraft.floorMainDeckMm  * 0.001;

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 15, 10]}  intensity={0.9} />
      <directionalLight position={[-10, 8, -10]} intensity={0.4} />
      <pointLight position={[0, 8, 0]} color={0xffffff} intensity={0.3} distance={60} />

      <Grid
        position={[0, floorMainDeckM - 0.02, -2]}
        args={[5, 60]}
        cellColor={0xdee2e6}
        sectionColor={0xadb5bd}
        scale={[1, 1, 12]}
      />

      <FuselageHull fuselageRadiusM={fuselageRadiusM} />
      <CargoLayout
        aircraft={aircraft}
        positions={positions}
        loadPlan={loadPlan}
        selectedPositionCode={selectedPositionCode}
        onUldClick={onUldClick}
      />

      <OrbitControls enableDamping dampingFactor={0.08} />
    </>
  );
}

// ── B777FViewer (root) ────────────────────────────────────────────────────────

export default function B777FViewer({ loadPlan = null, onUldClick = null, selectedPositionCode = null }) {
  const [aircraft,  setAircraft]  = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchAircraftConfig(B777F_AIRCRAFT_ID)
      .then(({ aircraft, positions }) => {
        setAircraft(aircraft);
        setPositions(positions);
        setLoading(false);
      })
      .catch((err) => {
        console.error('B777FViewer: failed to load aircraft config', err);
        setError('Could not load aircraft configuration. Is the backend running?');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8F9FA',
          color: '#6c757d',
          fontSize: 14,
        }}
      >
        Loading aircraft configuration…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8F9FA',
          color: '#dc3545',
          fontSize: 14,
          padding: 24,
          textAlign: 'center',
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [12, 6, 18], fov: 45, near: 0.1, far: 200 }}
      style={{ background: '#F8F9FA', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <AircraftScene
        aircraft={aircraft}
        positions={positions}
        loadPlan={loadPlan}
        selectedPositionCode={selectedPositionCode}
        onUldClick={onUldClick}
      />
    </Canvas>
  );
}
