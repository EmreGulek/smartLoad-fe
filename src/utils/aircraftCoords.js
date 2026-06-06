/**
 * aircraftCoords.js — Single place for aircraft ↔ Three.js coordinate conversion.
 *
 * ADR-0012: All persistent coordinates are stored in mm in the DB.
 * Three.js scene units are metres. This module is the only place
 * that performs the conversion — never divide by 1000 elsewhere.
 *
 * Coordinate convention:
 *   DB armMm         → Three.js Z  (positive = forward/nose)
 *   DB lateralOffsetMm → Three.js X  (positive = starboard/right)
 *   DB floorXxxMm    → Three.js Y  (negative = below centreline)
 *
 * Usage:
 *   import { positionToScene, parseContourPoints, contourMaxY } from './aircraftCoords';
 *
 *   const { x, y, z } = positionToScene(position, aircraft);
 *   const pts = parseContourPoints(position.uldType.pointsJson);  // metres
 */

const MM_TO_M = 0.001;

/**
 * Parse ULD contour points from DB JSON string → array of [x, y] in metres.
 * @param {string} pointsJson - JSON string, e.g. "[[0,0],[2440,0],…]" (mm)
 * @returns {number[][]} array of [x, y] pairs in metres
 */
export function parseContourPoints(pointsJson) {
  const pointsMm = JSON.parse(pointsJson);
  return pointsMm.map(([x, y]) => [x * MM_TO_M, y * MM_TO_M]);
}

/**
 * Compute the max Y value (top of contour) from points in metres.
 * Used to vertically centre the mesh above the floor.
 * @param {number[][]} pointsM - [[x,y],…] in metres
 * @returns {number} max Y in metres
 */
export function contourMaxY(pointsM) {
  return Math.max(...pointsM.map(([, y]) => y));
}

/**
 * Convert a DB AircraftPosition + Aircraft into Three.js {x, y, z} scene coordinates.
 *
 * @param {object} position  - AircraftPositionDto from API
 *   { armMm, lateralOffsetMm, deck, uldType: { pointsJson } }
 * @param {object} aircraft  - AircraftDto from API
 *   { floorMainDeckMm, floorLowerDeckMm }
 * @returns {{ x: number, y: number, z: number }} metres, ready for Three.js position prop
 */
export function positionToScene(position, aircraft) {
  const floorMm = position.deck === 'MAIN'
    ? aircraft.floorMainDeckMm
    : aircraft.floorLowerDeckMm;

  const pointsM = parseContourPoints(position.uldType.pointsJson);
  const maxY    = contourMaxY(pointsM);

  return {
    x: position.lateralOffsetMm * MM_TO_M,
    y: floorMm * MM_TO_M + maxY / 2,
    z: position.armMm * MM_TO_M,
  };
}

/**
 * Convert ULD length from mm → metres for ExtrudeGeometry depth.
 * @param {number} lengthMm
 * @returns {number} metres
 */
export function uldLengthM(lengthMm) {
  return lengthMm * MM_TO_M;
}
