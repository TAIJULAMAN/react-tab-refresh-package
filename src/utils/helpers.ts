/**
 * Utility functions for react-tab-refresh
 */

/**
 * Parse human-readable time strings to milliseconds
 * @example parseTime('30m') => 1800000
 * @example parseTime('1h') => 3600000
 * @example parseTime('2d') => 172800000
 */
export function parseTime(time: number | string): number {
    if (typeof time === 'number') {
        return time;
    }

    const match = time.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!match) {
        throw new Error(
            `Invalid time format: "${time}". Use format like "30m", "1h", "2d", or milliseconds.`
        );
    }

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    const multipliers: Record<string, number> = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return num * multipliers[unit];
}

/**
 * Format milliseconds to human-readable string
 * @example formatTime(1800000) => "30m"
 */
export function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    if (seconds > 0) return `${seconds}s`;
    return `${ms}ms`;
}

/**
 * Check if performance.memory API is available (Chrome only)
 */
export function isMemoryAPIAvailable(): boolean {
    return (
        typeof performance !== 'undefined' &&
        'memory' in performance &&
        performance.memory !== null
    );
}

/**
 * Get current memory usage in MB (Chrome only)
 */
export function getMemoryUsage(): number | undefined {
    if (!isMemoryAPIAvailable()) {
        return undefined;
    }

    const memory = (performance as any).memory;
    return Math.round(memory.usedJSHeapSize / 1024 / 1024);
}

/**
 * Get current DOM node count
 */
export function getDomNodeCount(): number {
    return document.getElementsByTagName('*').length;
}

/**
 * Create a namespaced storage key
 */
export function createStorageKey(key: string): string {
    return `rtr_${key}`;
}

/**
 * Debug logger that only logs in development
 */
export function createLogger(namespace: string, enabled: boolean = false) {
    const isDev = process.env.NODE_ENV !== 'production';
    const shouldLog = isDev && enabled;

    return {
        log: (...args: any[]) => {
            if (shouldLog) {
                console.log(`[react-tab-refresh:${namespace}]`, ...args);
            }
        },
        warn: (...args: any[]) => {
            if (shouldLog) {
                console.warn(`[react-tab-refresh:${namespace}]`, ...args);
            }
        },
        error: (...args: any[]) => {
            if (shouldLog) {
                console.error(`[react-tab-refresh:${namespace}]`, ...args);
            }
        },
    };
}

/**
 * Check if a value is serializable
 */
export function isSerializable(value: any): boolean {
    if (value === null || value === undefined) {
        return true;
    }

    const type = typeof value;

    if (type === 'boolean' || type === 'number' || type === 'string') {
        return true;
    }

    if (type === 'function' || type === 'symbol') {
        return false;
    }

    if (Array.isArray(value)) {
        return value.every(isSerializable);
    }

    if (type === 'object') {
        // Check for non-plain objects
        if (value.constructor !== Object && value.constructor !== Array) {
            return false;
        }

        return Object.values(value).every(isSerializable);
    }

    return false;
}

/**
 * Safely serialize a value to JSON
 */
export function safeSerialize<T>(value: T): string | null {
    try {
        return JSON.stringify(value);
    } catch (error) {
        console.error('[react-tab-refresh] Serialization failed:', error);
        return null;
    }
}

/**
 * Safely deserialize JSON to a value
 */
export function safeDeserialize<T>(json: string): T | null {
    try {
        return JSON.parse(json) as T;
    } catch (error) {
        console.error('[react-tab-refresh] Deserialization failed:', error);
        return null;
    }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delay);
    };
}

/**
 * Check if Page Visibility API is supported
 */
export function isPageVisibilitySupported(): boolean {
    return typeof document !== 'undefined' && 'hidden' in document;
}

/**
 * Get the current visibility state
 */
export function isPageVisible(): boolean {
    if (!isPageVisibilitySupported()) {
        return true; // Assume visible if API not supported
    }
    return !document.hidden;
}
