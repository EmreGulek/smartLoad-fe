import axios from 'axios';

/**
 * Shared axios instance for SmartLoad backend calls.
 *
 * Vite dev server proxies /api/* to http://localhost:8080 (see vite.config.js).
 * In production, set VITE_API_BASE_URL in .env to override.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartload_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem('smartload_auth_token');
      localStorage.removeItem('smartload_auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Phase 0 sanity check used by services/health on first load.
export async function getHealth() {
  const { data } = await api.get('/health');
  return data;
}

// ── Phase 2: Aircraft configuration ──────────────────────────────────────────

/**
 * Fetch aircraft details + active positions for use in B777FViewer.
 * Returns { aircraft: AircraftDto, positions: AircraftPositionDto[] }.
 * @param {number} aircraftId - DB id (B777F = 1)
 */
export async function fetchAircraftConfig(aircraftId) {
  const [aircraftRes, positionsRes] = await Promise.all([
    api.get(`/aircraft/${aircraftId}`),
    api.get(`/aircraft/${aircraftId}/positions`),
  ]);
  return {
    aircraft:  aircraftRes.data,
    positions: positionsRes.data,
  };
}

// ── Phase 3: Load plan / bin packing ─────────────────────────────────────────

/**
 * Run bin-packing optimisation for a manifest.
 * Returns { loadPlanId: number }.
 * @param {string}   manifestId
 * @param {number}   aircraftId   default 1 (B777F)
 * @param {string[]} flightStops  ordered destination codes, first stop first.
 *                                E.g. ["IST","FRA","JFK"]. Empty/null = LOFO not computed.
 */
export async function optimizeLoadPlan(manifestId, aircraftId = 1, flightStops = []) {
  const { data } = await api.post('/load-plans/optimize', { manifestId, aircraftId, flightStops });
  return data;
}

/**
 * Fetch full load plan result including all ULD assignments + package placements.
 * @param {number} loadPlanId
 */
export async function fetchLoadPlan(loadPlanId) {
  const { data } = await api.get(`/load-plans/${loadPlanId}`);
  return data;
}

/**
 * List all load plans for a manifest (summary only).
 * @param {string} manifestId
 */
export async function fetchLoadPlansForManifest(manifestId) {
  const { data } = await api.get(`/load-plans/manifest/${manifestId}`);
  return data;
}

// ── Phase 5: PDF reports (LIR + Load Sheet) ──────────────────────────────────

/** Absolute URL of the LIR PDF for a plan (inline, printable). */
export function lirPdfUrl(loadPlanId) {
  return `${api.defaults.baseURL}/load-plans/${loadPlanId}/lir.pdf`;
}

/** Absolute URL of the Load Sheet PDF for a plan. */
export function loadSheetPdfUrl(loadPlanId) {
  return `${api.defaults.baseURL}/load-plans/${loadPlanId}/load-sheet.pdf`;
}

/** Open a PDF report in a new browser tab. */
export function openPdfReport(url) {
  window.open(url, '_blank', 'noopener');
}
