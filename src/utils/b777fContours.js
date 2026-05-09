/**
 * B777F contour specifications.
 *
 * Source: raw/docs/B777F_Inspection_System.txt (original standalone viewer)
 *         raw/docs/B777F Main Deck ULD ... .pptx (geometric truth source)
 *
 * NOTE: Hardcoded in Phase 0. In Phase 2 this data will be loaded from the
 * backend (`aircraft_positions` + `uld_types` tables).
 * See MASTER-PLAN.md Phase 2 for the migration plan.
 */

export const CONTOURS = {
  A: {
    color: 0xffaa00,
    length: 3.18,
    vol: '17.5 m³',
    points: [
      [0, 0],
      [2.44, 0],
      [2.44, 1.8],
      [1.7, 2.95],
      [0, 2.95],
    ],
    meta: {
      name: 'CODE A',
      type: 'Nose Container',
      con: 'Q4 (Narrow)',
      h: '295 cm',
      s: '180 cm',
      off: '74 cm',
    },
  },
  M: {
    color: 0x00ff88,
    length: 3.18,
    vol: '21.2 m³',
    points: [
      [0, 0],
      [2.44, 0],
      [2.44, 1.92],
      [1.88, 3.0],
      [0, 3.0],
    ],
    meta: {
      name: 'CODE M',
      type: 'Standard Main Deck',
      con: 'Q5 (Asym)',
      h: '300 cm',
      s: '192 cm',
      off: '56 cm',
    },
  },
  R_High: {
    color: 0x0088ff,
    length: 4.96,
    vol: '28.3 m³',
    points: [
      [0, 0],
      [2.44, 0],
      [2.44, 1.35],
      [2.36, 2.74],
      [0, 2.74],
    ],
    meta: {
      name: 'CODE R',
      type: '16ft Pallet (End)',
      con: 'High Profile',
      h: '274 cm',
      s: '135 cm',
      off: '8 cm',
    },
  },
  R_Low: {
    color: 0x0055aa,
    length: 4.96,
    vol: '26.1 m³',
    points: [
      [0, 0],
      [2.44, 0],
      [2.44, 1.95],
      [2.03, 2.43],
      [0, 2.43],
    ],
    meta: {
      name: 'CODE R',
      type: '16ft Pallet (Mid)',
      con: 'Low Profile',
      h: '243 cm',
      s: '195 cm',
      off: '41 cm',
    },
  },
  G: {
    color: 0x9900ff,
    length: 6.06,
    vol: '35.0 m³',
    points: [
      [-1.22, 0],
      [1.22, 0],
      [1.22, 3.0],
      [-1.22, 3.0],
    ],
    meta: {
      name: 'CODE G',
      type: '20ft Centerline',
      con: 'Q6 (Rect)',
      h: '300 cm',
      s: 'N/A',
      off: '0 cm',
    },
  },
  LD3: {
    color: 0x00ffff,
    length: 1.53,
    vol: '4.3 m³',
    points: [
      [0, 0],
      [1.56, 0],
      [2.0, 0.45],
      [2.0, 1.63],
      [0, 1.63],
    ],
    meta: {
      name: 'LD3',
      type: 'Belly',
      con: 'LD3',
      h: '163 cm',
      s: '45 cm',
      off: '44 cm',
    },
  },
};

export const PLANE = {
  radius: 3.095,
  floorMain: -0.68,
  floorLower: -2.48,
};
