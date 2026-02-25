import { GameResult, SchulteConfig, SchulteSymbolOrder, SchulteTableStyle, SchulteTableType, SchulteTrainingMode } from '../types';

const DEFAULT_TABLE_SIZE = 5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isSchulteTrainingMode = (value: unknown): value is SchulteTrainingMode =>
  value === 'classic' || value === 'targeted';

export const isSchulteTableType = (value: unknown): value is SchulteTableType =>
  value === 'digits' || value === 'letters' || value === 'gorbov-schulte';

export const isSchulteTableStyle = (value: unknown): value is SchulteTableStyle =>
  value === 'classic' || value === 'round' || value === 'colored' || value === 'voronoi';

export const isSchulteSymbolOrder = (value: unknown): value is SchulteSymbolOrder =>
  value === 'direct' || value === 'reverse' || value === 'random';

export const createDefaultSchulteConfig = (tableSize: number = DEFAULT_TABLE_SIZE): SchulteConfig => ({
  tableSize,
  tableType: 'digits',
  tableStyle: 'classic',
  symbolOrder: 'direct',
  shuffleOnClick: false,
  showCenterDot: true,
  trainingMode: 'classic'
});

export const sanitizeSchulteConfig = (value: unknown): SchulteConfig | null => {
  if (!isRecord(value)) return null;
  if (!isFiniteNumber(value.tableSize) || !Number.isInteger(value.tableSize) || value.tableSize < 3 || value.tableSize > 10) {
    return null;
  }
  if (!isSchulteTableType(value.tableType)) return null;
  if (!isSchulteTableStyle(value.tableStyle)) return null;
  if (!isSchulteSymbolOrder(value.symbolOrder)) return null;
  if (!isBoolean(value.shuffleOnClick) || !isBoolean(value.showCenterDot)) return null;
  if (!isSchulteTrainingMode(value.trainingMode)) return null;

  return {
    tableSize: value.tableSize,
    tableType: value.tableType,
    tableStyle: value.tableStyle,
    symbolOrder: value.symbolOrder,
    shuffleOnClick: value.shuffleOnClick,
    showCenterDot: value.showCenterDot,
    trainingMode: value.trainingMode
  };
};

export const getSchulteConfigKey = (config: SchulteConfig) =>
  [
    config.tableSize,
    config.tableType,
    config.tableStyle,
    config.symbolOrder,
    config.shuffleOnClick ? 1 : 0,
    config.showCenterDot ? 1 : 0,
    config.trainingMode
  ].join('|');

export const getResultSchulteConfig = (result: GameResult): SchulteConfig | null => {
  if (result.gameType !== 'schulte') return null;
  if (result.schulteConfig) {
    const parsed = sanitizeSchulteConfig(result.schulteConfig);
    if (parsed) return parsed;
  }
  const fallbackSize = result.gridSize ?? DEFAULT_TABLE_SIZE;
  return createDefaultSchulteConfig(fallbackSize);
};

export const getResultSchulteConfigKey = (result: GameResult): string | null => {
  const config = getResultSchulteConfig(result);
  return config ? getSchulteConfigKey(config) : null;
};
