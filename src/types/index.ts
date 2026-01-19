/**
 * Core type definitions for react-tab-refresh
 */

/**
 * Options for usePrunableState hook
 */
export interface PrunableStateOptions<T> {
    /**
     * Custom serialization function
     * @default JSON.stringify
     */
    serialize?: (value: T) => string;

    /**
     * Custom deserialization function
     * @default JSON.parse
     */
    deserialize?: (value: string) => T;

    /**
     * Validation function to check if restored data is valid
     * Return false to use initialValue instead
     */
    validate?: (value: T) => boolean;

    /**
     * Time-to-live in milliseconds
     * Data older than this will be discarded
     */
    ttl?: number;

    /**
     * Callback when data expires
     */
    onExpired?: () => void;

    /**
     * Enable debug logging
     * @default false
     */
    debug?: boolean;
}

/**
 * Configuration for PruneProvider
 */
export interface PruneProviderConfig {
    /**
     * Maximum inactivity time before pruning (in milliseconds)
     * @default 1800000 (30 minutes)
     */
    pruneAfter?: number | string; // e.g., '30m', '1h', or milliseconds

    /**
     * Maximum memory threshold in MB (Chrome only)
     * @default undefined (disabled)
     */
    maxMemoryMb?: number;

    /**
     * Enable memory monitoring (Chrome only)
     * @default false
     */
    enableMemoryMonitoring?: boolean;

    /**
     * Maximum DOM nodes before pruning
     * @default undefined (disabled)
     */
    maxDomNodes?: number;

    /**
     * Callback before pruning (for cleanup)
     */
    onPrune?: () => void | Promise<void>;

    /**
     * Callback after rehydration (for reconnection)
     */
    onRehydrate?: () => void | Promise<void>;

    /**
     * Enable debug logging
     * @default false
     */
    debug?: boolean;

    /**
     * Custom storage adapter
     * @default SessionStorageAdapter
     */
    storageAdapter?: StorageAdapter;
}

/**
 * Props for PruneProvider component
 */
export interface PruneProviderProps {
    children: React.ReactNode;
    config?: PruneProviderConfig;
    /**
     * Component to show during rehydration
     */
    placeholder?: React.ReactNode;
}

/**
 * Context value for pruning state
 */
export interface PruningContextValue {
    /**
     * Whether the app is currently pruned
     */
    isPruned: boolean;

    /**
     * Whether the app is currently rehydrating
     */
    isRehydrating: boolean;

    /**
     * Current metrics
     */
    metrics: PruningMetrics;

    /**
     * Force immediate rehydration
     */
    forceRehydrate: () => void;

    /**
     * Register cleanup function to be called before pruning
     */
    registerCleanup: (key: string, cleanup: () => void | Promise<void>) => void;

    /**
     * Unregister cleanup function
     */
    unregisterCleanup: (key: string) => void;
}

/**
 * Metrics about the current pruning state
 */
export interface PruningMetrics {
    /**
     * Time in milliseconds since tab became inactive
     */
    inactiveMs: number;

    /**
     * Current memory usage in MB (Chrome only)
     */
    memoryMb?: number;

    /**
     * Current DOM node count
     */
    domNodes?: number;

    /**
     * Last prune timestamp
     */
    lastPruneAt?: number;

    /**
     * Last rehydration timestamp
     */
    lastRehydrateAt?: number;
}

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
    get<T>(key: string): T | null;
    set<T>(key: string, value: T): boolean;
    remove(key: string): void;
    clear(): void;
    getUsage(): StorageUsage;
}

/**
 * Storage usage information
 */
export interface StorageUsage {
    used: number;
    available: number;
    percentage: number;
}

/**
 * Stored state metadata
 */
export interface StoredStateMetadata {
    value: unknown;
    timestamp: number;
    version?: string;
}

/**
 * Configuration for InactivityMonitor
 */
export interface MonitorConfig {
    maxInactivityMs: number;
    maxMemoryMb?: number;
    maxDomNodes?: number;
    enableMemoryMonitoring: boolean;
    pollingInterval: number;
    debug: boolean;
}

/**
 * Events emitted by InactivityMonitor
 */
export type MonitorEvent = 'threshold-exceeded' | 'metrics-updated';

/**
 * Callback for monitor events
 */
export type MonitorCallback = (metrics: PruningMetrics) => void;
