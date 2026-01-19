/**
 * react-tab-refresh
 * Stop the Memory Bloat — Automatically prune and re-hydrate your long-lived React apps
 */

// Components
export { PruneProvider } from './components/PruneProvider';

// Hooks
export { usePrunableState, useClearPrunableState, useStorageUsage } from './hooks/usePrunableState';
export { usePruningState } from './hooks/usePruningState';

// Types
export type {
    PrunableStateOptions,
    PruneProviderConfig,
    PruneProviderProps,
    PruningContextValue,
    PruningMetrics,
    StorageAdapter,
    StorageUsage,
} from './types';

// Utilities (for advanced users)
export { createStorageAdapter } from './utils/StorageManager';
export { InactivityMonitor } from './core/InactivityMonitor';
