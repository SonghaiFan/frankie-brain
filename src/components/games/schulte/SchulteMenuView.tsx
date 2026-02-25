import React from 'react';
import {
  ArrowUpDown,
  Box,
  ChartNoAxesColumn,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Grid3X3,
  Plus,
  Settings,
  Shuffle,
  CircleStar,
} from 'lucide-react';
import {
  GameResult,
  SchultePreset,
  SchulteRoundEvent,
  SchulteSymbolOrder,
  SchulteTableStyle,
  SchulteTableType,
  SchulteTrainingMode
} from '../../../types';
import { formatTime } from '../../GameShell';
import { SchulteStats } from '../../SchulteStats';
import { Button } from '../../ui/Button';
import { Label, Mono, SubHeading } from '../../ui/Typography';
import { SCHULTE_TABLE_SIZES } from './schulteCore';

interface SchulteMenuViewProps {
  showInsights: boolean;
  onShowInsightsChange: (next: boolean) => void;
  history: GameResult[];
  roundEvents: SchulteRoundEvent[];
  gridSize: number;
  currentConfigKey: string;
  allPresets: SchultePreset[];
  activePreset: SchultePreset | null;
  activeCustomPreset: SchultePreset | null;
  onApplyPreset: (preset: SchultePreset) => void;
  onSavePreset: () => void;
  onDeleteCustomPreset: (preset: SchultePreset) => void;
  tableTypeLabel: string;
  tableStyleLabel: string;
  symbolOrderLabel: string;
  trainingLabel: string;
  shuffleOnClick: boolean;
  trainingMode: SchulteTrainingMode;
  tableType: SchulteTableType;
  tableStyle: SchulteTableStyle;
  symbolOrder: SchulteSymbolOrder;
  canUseTargetedMode: boolean;
  showAdvancedSettings: boolean;
  onToggleAdvancedSettings: () => void;
  onGridSizeChange: (size: number) => void;
  onTableTypeChange: (tableType: SchulteTableType) => void;
  onTableStyleChange: (tableStyle: SchulteTableStyle) => void;
  onSymbolOrderChange: (order: SchulteSymbolOrder) => void;
  onShuffleOnClickChange: (enabled: boolean) => void;
  onTrainingModeChange: (mode: SchulteTrainingMode) => void;
  stats: {
    best: number | null;
    average: number | null;
  };
  onStart: () => void;
}

export const SchulteMenuView: React.FC<SchulteMenuViewProps> = ({
  showInsights,
  onShowInsightsChange,
  history,
  roundEvents,
  gridSize,
  currentConfigKey,
  allPresets,
  activePreset,
  activeCustomPreset,
  onApplyPreset,
  onSavePreset,
  onDeleteCustomPreset,
  tableTypeLabel,
  tableStyleLabel,
  symbolOrderLabel,
  trainingLabel,
  shuffleOnClick,
  trainingMode,
  tableType,
  tableStyle,
  symbolOrder,
  canUseTargetedMode,
  showAdvancedSettings,
  onToggleAdvancedSettings,
  onGridSizeChange,
  onTableTypeChange,
  onTableStyleChange,
  onSymbolOrderChange,
  onShuffleOnClickChange,
  onTrainingModeChange,
  stats,
  onStart
}) => {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-surface">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <SubHeading>{showInsights ? 'Insights' : 'Settings'}</SubHeading>
        <div
          className="inline-flex items-center rounded-full border border-secondary bg-secondary p-0.5"
          role="tablist"
          aria-label="Schulte menu view switcher"
        >
          <button
            onClick={() => onShowInsightsChange(false)}
            role="tab"
            aria-selected={!showInsights}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              !showInsights ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
            }`}
            title="Show Settings"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => onShowInsightsChange(true)}
            role="tab"
            aria-selected={showInsights}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              showInsights ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
            }`}
            title="Show Insights"
          >
            <ChartNoAxesColumn className="h-3.5 w-3.5" />
            <span>Insights</span>
          </button>
        </div>
      </div>

      {showInsights ? (
        <div className="flex-1 space-y-6">
          <SchulteStats
            history={history}
            roundEvents={roundEvents}
            gridSize={gridSize}
            configKey={currentConfigKey}
            showTitle={false}
            className="p-0 sm:p-0"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center gap-6">
          <div>
            <Label className="mb-3 block text-center">Mode</Label>
            <div className="mx-auto flex w-full max-w-md items-center justify-center gap-2 overflow-x-auto pb-1">
              {allPresets.map((preset) => {
                const isActive = activePreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    className={`inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3.5 text-xs font-medium transition-[background-color,color,border-color,box-shadow] ${
                      isActive
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : 'border-secondary bg-secondary text-ink-light hover:bg-secondary-hover'
                    }`}
                    title={preset.name}
                    aria-label={`Preset ${preset.name}`}
                  >
                    <span className="max-w-[140px] truncate">{preset.name}</span>
                  </button>
                );
              })}
              <button
                onClick={onSavePreset}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-secondary bg-surface text-lg font-medium text-ink-light transition-colors hover:bg-secondary hover:text-ink"
                title="Create preset from current settings"
                aria-label="Create preset"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                <Grid3X3 className="h-3 w-3" />
                {gridSize}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                <Box className="h-3 w-3" />
                {tableTypeLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                <Grid3X3 className="h-3 w-3" />
                {tableStyleLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                <ArrowUpDown className="h-3 w-3" />
                {symbolOrderLabel}
              </span>
              {!shuffleOnClick || tableType === 'gorbov-schulte' ? null : (
                <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                  <Shuffle className="h-3 w-3" />
                  {shuffleOnClick ? 'Shuffle' : 'Static'}
                </span>
              )}
              {trainingMode === 'targeted' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                  <Crosshair className="h-3 w-3" />
                  {trainingLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <button
              onClick={onToggleAdvancedSettings}
              className="mx-auto inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-light hover:text-ink"
            >
              <span>Advanced</span>
              {showAdvancedSettings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showAdvancedSettings && (
              <div className="mt-3 space-y-4 rounded-2xl border border-secondary bg-surface p-3">
                <div>
                  <Label className="mb-2 block text-center">
                    <span className="inline-flex items-center gap-1">
                      <Grid3X3 className="h-3.5 w-3.5" />
                      Grid Size
                    </span>
                  </Label>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {SCHULTE_TABLE_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => onGridSizeChange(size)}
                        className={`h-10 w-10 rounded-full font-semibold text-sm transition-[background-color,color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
                          gridSize === size ? 'bg-primary text-white shadow-sm' : 'bg-secondary text-ink-light hover:bg-secondary-hover'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-center">
                    <span className="inline-flex items-center gap-1">
                      <Box className="h-3.5 w-3.5" />
                      Table Type
                    </span>
                  </Label>
                  <div className="inline-flex w-full items-center rounded-full border border-secondary bg-secondary p-0.5">
                    <button
                      onClick={() => onTableTypeChange('digits')}
                      className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        tableType === 'digits' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      }`}
                    >
                      Digits
                    </button>
                    <button
                      onClick={() => onTableTypeChange('letters')}
                      className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        tableType === 'letters' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      }`}
                    >
                      Letters
                    </button>
                    <button
                      onClick={() => onTableTypeChange('gorbov-schulte')}
                      className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        tableType === 'gorbov-schulte' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      }`}
                    >
                      Gorbov
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-center">
                    <span className="inline-flex items-center gap-1">
                      <CircleStar className="h-3.5 w-3.5" />
                      Cell Style
                    </span>
                  </Label>
                  <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-secondary bg-secondary p-1">
                    <button
                      onClick={() => onTableStyleChange('grid')}
                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        tableStyle === 'grid' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => onTableStyleChange('colored')}
                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        tableStyle === 'colored' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      }`}
                    >
                      Colored
                    </button>
                    <button
                      onClick={() => onTableStyleChange('round')}
                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        tableStyle === 'round' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      }`}
                    >
                      Circle
                    </button>
                    <button
                      onClick={() => onTableStyleChange('voronoi')}
                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        tableStyle === 'voronoi' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      }`}
                    >
                      Voronoi
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-center">
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Symbol Order
                    </span>
                  </Label>
                  <div className="inline-flex w-full items-center rounded-full border border-secondary bg-secondary p-0.5">
                    <button
                      onClick={() => onSymbolOrderChange('direct')}
                      disabled={tableType === 'gorbov-schulte'}
                      className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        symbolOrder === 'direct' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      } ${tableType === 'gorbov-schulte' ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      Direct
                    </button>
                    <button
                      onClick={() => onSymbolOrderChange('reverse')}
                      disabled={tableType === 'gorbov-schulte'}
                      className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        symbolOrder === 'reverse' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      } ${tableType === 'gorbov-schulte' ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      Reverse
                    </button>
                    <button
                      onClick={() => onSymbolOrderChange('random')}
                      disabled={tableType === 'gorbov-schulte'}
                      className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        symbolOrder === 'random' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      } ${tableType === 'gorbov-schulte' ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      Random
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-center">
                    <span className="inline-flex items-center gap-1">
                      <Shuffle className="h-3.5 w-3.5" />
                      Shuffle on Click
                    </span>
                  </Label>
                  <div className="inline-flex w-full items-center rounded-full border border-secondary bg-secondary p-0.5">
                    <button
                      onClick={() => onShuffleOnClickChange(true)}
                      disabled={tableType === 'gorbov-schulte'}
                      className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        shuffleOnClick ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      } ${tableType === 'gorbov-schulte' ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      On
                    </button>
                    <button
                      onClick={() => onShuffleOnClickChange(false)}
                      disabled={tableType === 'gorbov-schulte'}
                      className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        !shuffleOnClick ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      } ${tableType === 'gorbov-schulte' ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      Off
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-center">
                    <span className="inline-flex items-center gap-1">
                      <Crosshair className="h-3.5 w-3.5" />
                      Targeted Training
                    </span>
                  </Label>
                  <div className="inline-flex w-full items-center rounded-full border border-secondary bg-secondary p-0.5">
                    <button
                      onClick={() => onTrainingModeChange('default')}
                      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        trainingMode === 'default' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      }`}
                    >
                      <span>Off</span>
                    </button>
                    <button
                      onClick={() => onTrainingModeChange('targeted')}
                      disabled={!canUseTargetedMode}
                      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        trainingMode === 'targeted' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                      } ${!canUseTargetedMode ? 'cursor-not-allowed opacity-50' : ''}`}
                      title={canUseTargetedMode ? 'Targeted training' : 'Requires more tracking data'}
                    >
                      <span>On</span>
                    </button>
                  </div>
                </div>

                {activeCustomPreset && (
                  <div className="border-t border-secondary pt-4">
                    <button
                      onClick={() => onDeleteCustomPreset(activeCustomPreset)}
                      className="w-full rounded-full border border-secondary px-3 py-2 text-xs font-medium uppercase tracking-wider text-[var(--color-error)] hover:bg-secondary"
                    >
                      Delete "{activeCustomPreset.name}" and clear data
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-px bg-secondary border border-secondary rounded-md overflow-hidden">
            <div className="bg-surface p-3 sm:p-4 text-left">
              <Label className="mb-1 block">Best</Label>
              <Mono className="text-base sm:text-lg font-medium">
                {stats.best !== null ? formatTime(stats.best) : '--'}
              </Mono>
            </div>
            <div className="bg-surface p-3 sm:p-4 text-left">
              <Label className="mb-1 block">Avg</Label>
              <Mono className="text-base sm:text-lg font-medium">
                {stats.average !== null ? formatTime(stats.average) : '--'}
              </Mono>
            </div>
          </div>

          <Button onClick={onStart} fullWidth size="lg">
            Start
          </Button>
        </div>
      )}
    </div>
  );
};
