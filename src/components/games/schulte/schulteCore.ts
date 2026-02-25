import {
  SchultePreset,
  SchulteRoundEvent,
  SchulteSymbolOrder,
  SchulteTableStyle
} from '../../../types';
import { sanitizeSchulteConfig } from '../../../utils/schulteConfig';

export const SCHULTE_ROUND_EVENTS_KEY = 'brain-trainer-schulte-round-events';
export const SCHULTE_ROUND_EVENTS_MAX = 600;
export const SCHULTE_PRESETS_KEY = 'brain-trainer-schulte-presets';
export const SCHULTE_PRESETS_MAX = 30;
export const SCHULTE_TABLE_SIZES = [3, 4, 5, 6, 7, 8, 9] as const;

export const BUILTIN_PRESETS: SchultePreset[] = [
  {
    id: 'builtin-default-5x5',
    name: 'Default',
    createdAt: 0,
    config: {
      tableSize: 5,
      tableType: 'digits',
      tableStyle: 'grid',
      symbolOrder: 'direct',
      shuffleOnClick: false,
      showCenterDot: false,
      trainingMode: 'default'
    }
  },
  {
    id: 'builtin-gorbov-6x6',
    name: 'Gorbov',
    createdAt: 0,
    config: {
      tableSize: 6,
      tableType: 'gorbov-schulte',
      tableStyle: 'grid',
      symbolOrder: 'direct',
      shuffleOnClick: false,
      showCenterDot: false,
      trainingMode: 'default'
    }
  }
];

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isSchulteRoundEvent = (value: unknown): value is SchulteRoundEvent => {
  if (!isObjectRecord(value)) return false;
  const gridSize = value.gridSize;
  return (
    typeof value.id === 'string' &&
    isFiniteNumber(value.date) &&
    isFiniteNumber(gridSize) &&
    Number.isInteger(gridSize) &&
    gridSize > 0 &&
    (value.trainingMode === 'default' || value.trainingMode === 'targeted') &&
    (value.status === 'completed' || value.status === 'abandoned') &&
    (value.reason === 'finished' || value.reason === 'reset' || value.reason === 'exit') &&
    isFiniteNumber(value.progress) &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.durationMs) &&
    isFiniteNumber(value.mistakes) &&
    (value.configKey === undefined || typeof value.configKey === 'string') &&
    (value.presetId === undefined || typeof value.presetId === 'string')
  );
};

export const isSchultePreset = (value: unknown): value is SchultePreset => {
  if (!isObjectRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.name !== 'string' || !isFiniteNumber(value.createdAt)) return false;
  const config = sanitizeSchulteConfig(value.config);
  return config !== null && config.tableSize <= 9;
};

export const appendRoundEventToStorage = (event: SchulteRoundEvent) => {
  try {
    const raw = localStorage.getItem(SCHULTE_ROUND_EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const existing = Array.isArray(parsed) ? parsed.filter(isSchulteRoundEvent) : [];
    const next = [event, ...existing].slice(0, SCHULTE_ROUND_EVENTS_MAX);
    localStorage.setItem(SCHULTE_ROUND_EVENTS_KEY, JSON.stringify(next));
  } catch {
    // Swallow persistence errors to avoid interrupting gameplay.
  }
};

export type GorbovTone = 'black' | 'red';

export interface GorbovSymbol {
  id: number;
  value: number;
  tone: GorbovTone;
}

interface Point2D {
  x: number;
  y: number;
}

export interface VoronoiCell {
  pointsAttr: string;
  centroid: Point2D;
}

const VORONOI_EPSILON = 1e-9;

export const normalizeTableStyle = (style: SchulteTableStyle): SchulteTableStyle =>
  style === 'grid' || style === 'round' || style === 'colored' || style === 'voronoi'
    ? style
    : 'grid';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const createVoronoiSites = (count: number, seed: number) => {
  const random = createSeededRandom(seed);
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const jitterX = 0.38 / columns;
  const jitterY = 0.38 / rows;
  const sites: Point2D[] = [];

  for (let index = 0; index < count; index++) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = (col + 0.5) / columns + (random() * 2 - 1) * jitterX;
    const y = (row + 0.5) / rows + (random() * 2 - 1) * jitterY;
    sites.push({
      x: clamp(x, 0.02, 0.98),
      y: clamp(y, 0.02, 0.98)
    });
  }

  return sites;
};

const intersectSegmentWithLine = (
  start: Point2D,
  end: Point2D,
  a: number,
  b: number,
  c: number
): Point2D => {
  const startValue = a * start.x + b * start.y - c;
  const endValue = a * end.x + b * end.y - c;
  const denom = startValue - endValue;
  if (Math.abs(denom) < VORONOI_EPSILON) return end;
  const t = startValue / denom;
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t
  };
};

const clipPolygonByHalfPlane = (polygon: Point2D[], a: number, b: number, c: number): Point2D[] => {
  if (!polygon.length) return [];
  const isInside = (point: Point2D) => a * point.x + b * point.y <= c + VORONOI_EPSILON;
  const clipped: Point2D[] = [];

  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const currentInside = isInside(current);
    const nextInside = isInside(next);

    if (currentInside && nextInside) {
      clipped.push(next);
      continue;
    }

    if (currentInside && !nextInside) {
      clipped.push(intersectSegmentWithLine(current, next, a, b, c));
      continue;
    }

    if (!currentInside && nextInside) {
      clipped.push(intersectSegmentWithLine(current, next, a, b, c));
      clipped.push(next);
    }
  }

  return clipped;
};

const createFallbackPolygon = (site: Point2D, pad = 0.03): Point2D[] => [
  { x: clamp(site.x - pad, 0, 1), y: clamp(site.y - pad, 0, 1) },
  { x: clamp(site.x + pad, 0, 1), y: clamp(site.y - pad, 0, 1) },
  { x: clamp(site.x + pad, 0, 1), y: clamp(site.y + pad, 0, 1) },
  { x: clamp(site.x - pad, 0, 1), y: clamp(site.y + pad, 0, 1) }
];

const polygonToPointsAttr = (points: Point2D[]) =>
  points.map(point => `${(point.x * 100).toFixed(3)},${(point.y * 100).toFixed(3)}`).join(' ');

const shrinkPolygonTowardPoint = (points: Point2D[], center: Point2D, factor: number) =>
  points.map(point => ({
    x: clamp(center.x + (point.x - center.x) * factor, 0, 1),
    y: clamp(center.y + (point.y - center.y) * factor, 0, 1)
  }));

const computePolygonCentroid = (points: Point2D[], fallback: Point2D): Point2D => {
  if (points.length < 3) return fallback;

  let twiceArea = 0;
  let xSum = 0;
  let ySum = 0;

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    xSum += (current.x + next.x) * cross;
    ySum += (current.y + next.y) * cross;
  }

  if (Math.abs(twiceArea) < VORONOI_EPSILON) return fallback;

  return {
    x: clamp(xSum / (3 * twiceArea), 0.02, 0.98),
    y: clamp(ySum / (3 * twiceArea), 0.02, 0.98)
  };
};

export const createVoronoiCells = (count: number, seed: number): VoronoiCell[] => {
  if (count <= 0) return [];
  const sites = createVoronoiSites(count, seed);
  const shrinkFactor = count >= 64 ? 0.985 : count >= 36 ? 0.98 : 0.975;
  const bounds: Point2D[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ];

  return sites.map((site, index) => {
    let polygon = [...bounds];

    for (let otherIndex = 0; otherIndex < sites.length; otherIndex++) {
      if (index === otherIndex) continue;
      const other = sites[otherIndex];
      const a = other.x - site.x;
      const b = other.y - site.y;
      const c = (other.x * other.x + other.y * other.y - site.x * site.x - site.y * site.y) / 2;
      polygon = clipPolygonByHalfPlane(polygon, a, b, c);
      if (!polygon.length) break;
    }

    if (polygon.length < 3) polygon = createFallbackPolygon(site);

    const gapPolygon = shrinkPolygonTowardPoint(polygon, site, shrinkFactor);
    const centroid = computePolygonCentroid(gapPolygon, site);

    return {
      pointsAttr: polygonToPointsAttr(gapPolygon),
      centroid
    };
  });
};

export const shuffleNumbers = (values: number[]) => {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const buildSymbolOrder = (count: number, order: SchulteSymbolOrder) => {
  const base = Array.from({ length: count }, (_, i) => i + 1);
  if (order === 'reverse') return [...base].reverse();
  if (order === 'random') return shuffleNumbers(base);
  return base;
};

export const numberToLetters = (value: number) => {
  let n = value;
  let label = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
};

export const buildGorbovConfig = (count: number, order: SchulteSymbolOrder) => {
  const blackCount = Math.ceil(count / 2);
  const redCount = Math.floor(count / 2);
  const symbols: GorbovSymbol[] = [];
  const blackIdByValue: Record<number, number> = {};
  const redIdByValue: Record<number, number> = {};
  let nextId = 1;

  for (let value = 1; value <= blackCount; value++) {
    const id = nextId++;
    symbols.push({ id, value, tone: 'black' });
    blackIdByValue[value] = id;
  }

  for (let value = 1; value <= redCount; value++) {
    const id = nextId++;
    symbols.push({ id, value, tone: 'red' });
    redIdByValue[value] = id;
  }

  const pairedValues = Array.from({ length: redCount }, (_, i) => i + 1);
  const orderedPairs =
    order === 'reverse'
      ? [...pairedValues].reverse()
      : order === 'random'
        ? shuffleNumbers(pairedValues)
        : pairedValues;

  const targetOrder: number[] = [];
  orderedPairs.forEach(value => {
    targetOrder.push(blackIdByValue[value]);
    targetOrder.push(redIdByValue[value]);
  });

  if (blackCount > redCount) {
    targetOrder.push(blackIdByValue[blackCount]);
  }

  return {
    gridIds: shuffleNumbers(symbols.map(symbol => symbol.id)),
    targetOrder,
    symbols
  };
};
