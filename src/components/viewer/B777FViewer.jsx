/**
 * B777F 3D Viewer — react-three-fiber port of the original standalone HTML viewer.
 *
 * Phase 0: Static geometry, no interaction modes.
 * Phase 2: Will become DB-driven (positions + contours from backend).
 *
 * Original source: raw/docs/B777F_Inspection_System.txt
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { CONTOURS, PLANE } from '../../utils/b777fContours';

function ContourMesh({ spec, position, mirror = false }) {
  // Build the extruded geometry from the 2D contour points
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(spec.points[0][0], spec.points[0][1]);
    for (let i = 1; i < spec.points.length; i++) {
      shape.lineTo(spec.points[i][0], spec.points[i][1]);
    }
    shape.lineTo(spec.points[0][0], spec.points[0][1]);

    const geom = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: spec.length,
      bevelEnabled: false,
    });
    geom.center();
    return geom;
  }, [spec]);

  // Edge lines (subtle outline)
  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  const scale = mirror ? [-1, 1, 1] : [1, 1, 1];

  return (
    <group position={position} scale={scale}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={spec.color}
          metalness={0.15}
          roughness={0.55}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial color={0x495057} transparent opacity={0.25} />
      </lineSegments>
    </group>
  );
}

/**
 * Build the static cargo layout — mirrors the original buildPlane() function.
 * Phase 2 replaces this with backend-driven position data.
 */
function CargoLayout() {
  const placements = useMemo(() => {
    const items = [];
    let z = 25;

    items.push({ key: 'A', x: 1.3, z, mirror: false });
    items.push({ key: 'A', x: 1.3, z, mirror: true });
    z -= 3.4;
    items.push({ key: 'A', x: 1.3, z, mirror: false });
    items.push({ key: 'A', x: 1.3, z, mirror: true });
    z -= 3.4;

    for (let i = 0; i < 3; i++) {
      items.push({ key: 'M', x: 1.35, z, mirror: false });
      items.push({ key: 'M', x: 1.35, z, mirror: true });
      z -= 3.4;
    }

    items.push({ key: 'R_High', x: 1.35, z: z - 1, mirror: false });
    items.push({ key: 'R_High', x: 1.35, z: z - 1, mirror: true });
    z -= 5.2;

    items.push({ key: 'R_Low', x: 1.35, z: z - 1, mirror: false });
    items.push({ key: 'R_Low', x: 1.35, z: z - 1, mirror: true });
    z -= 5.2;

    items.push({ key: 'G', x: 0, z: z - 1.5, mirror: false });
    z -= 6.5;

    items.push({ key: 'R_High', x: 1.35, z: z - 1, mirror: false });
    items.push({ key: 'R_High', x: 1.35, z: z - 1, mirror: true });

    return items;
  }, []);

  const ld3s = useMemo(() => {
    const items = [];
    let lz = 22;
    for (let i = 0; i < 15; i++) {
      if (lz < 5 && lz > -5) {
        lz -= 1.8;
        continue;
      }
      items.push({ x: 1.1, z: lz, mirror: false });
      items.push({ x: 1.1, z: lz, mirror: true });
      lz -= 1.8;
    }
    return items;
  }, []);

  return (
    <group>
      {placements.map((p, idx) => {
        const spec = CONTOURS[p.key];
        let maxY = 0;
        spec.points.forEach((pt) => (maxY = Math.max(maxY, pt[1])));
        const y = PLANE.floorMain + maxY / 2;
        const x = p.mirror ? -p.x : p.x;
        return (
          <ContourMesh
            key={`${p.key}-${idx}`}
            spec={spec}
            position={[x, y, p.z]}
            mirror={p.mirror}
          />
        );
      })}

      {ld3s.map((p, idx) => {
        const spec = CONTOURS.LD3;
        let maxY = 0;
        spec.points.forEach((pt) => (maxY = Math.max(maxY, pt[1])));
        const y = PLANE.floorLower + maxY / 2;
        const x = p.mirror ? -p.x : p.x;
        return (
          <ContourMesh
            key={`ld3-${idx}`}
            spec={spec}
            position={[x, y, p.z]}
            mirror={p.mirror}
          />
        );
      })}
    </group>
  );
}

/**
 * Fuselage hull as a wireframe cylinder — visual reference for the
 * IATA L-91 max contour envelope.
 */
function FuselageHull() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[PLANE.radius, PLANE.radius, 60, 64, 1, true]} />
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

export default function B777FViewer() {
  return (
    <Canvas
      camera={{ position: [12, 6, 18], fov: 45, near: 0.1, far: 200 }}
      style={{ background: '#F8F9FA', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 15, 10]} intensity={0.9} />
      <directionalLight position={[-10, 8, -10]} intensity={0.4} />
      <pointLight position={[0, 8, 0]} color={0xffffff} intensity={0.3} distance={60} />

      <Grid
        position={[0, PLANE.floorMain - 0.02, -2]}
        args={[5, 60]}
        cellColor={0xdee2e6}
        sectionColor={0xadb5bd}
        scale={[1, 1, 12]}
      />

      <FuselageHull />
      <CargoLayout />

      <OrbitControls enableDamping dampingFactor={0.08} />
    </Canvas>
  );
}
