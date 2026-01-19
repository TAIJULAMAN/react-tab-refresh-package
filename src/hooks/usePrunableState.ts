import { useState, useEffect, useRef, useCallback } from 'react';
import type { PrunableStateOptions } from '../types';
import { createStorageAdapter } from '../utils/StorageManager';
import {
    createLogger,
    debounce,
    isSerializable,
} from '../utils/helpers';

export function usePrunableState<T>(
    key: string,
    initialValue: T,
    options: PrunableStateOptions<T> = {}
): [T, (value: T | ((prev: T) => T)) => void] {
    const {
        validate,
        ttl,
        onExpired,
        debug = false,
    } = options;

    const logger = createLogger(`usePrunableState:${key}`, debug);
    const storage = useRef(createStorageAdapter()).current;
    const isMounted = useRef(true);

    // Initialize state from storage or use initial value
    const [state, setState] = useState<T>(() => {
        try {
            // Try to restore from storage
            const stored = storage.get<T>(key);

            if (stored === null) {
                logger.log('No stored value found, using initial value');
                return initialValue;
            }

            // Check TTL if specified
            if (ttl) {
                const metadata = (storage as any).getMetadata(key);
                if (metadata) {
                    const age = Date.now() - metadata.timestamp;
                    if (age > ttl) {
                        logger.log(`Stored value expired (age: ${age}ms, ttl: ${ttl}ms)`);
                        if (onExpired) {
                            onExpired();
                        }
                        return initialValue;
                    }
                }
            }

            // Validate if validator provided
            if (validate && !validate(stored)) {
                logger.warn('Stored value failed validation, using initial value');
                return initialValue;
            }

            logger.log('Restored value from storage');
            return stored;
        } catch (error) {
            logger.error('Failed to restore from storage:', error);
            return initialValue;
        }
    });

    // Debounced save to storage
    const saveToStorage = useRef(
        debounce((value: T) => {
            if (!isMounted.current) {
                return;
            }

            try {
                // Check if value is serializable
                if (!isSerializable(value)) {
                    logger.error(
                        `Cannot serialize value for key "${key}". Value contains non-serializable data (functions, classes, etc.).
            
Fix: Use the 'transform' option to convert to JSON-safe format.
Docs: https://github.com/yourusername/react-tab-refresh#serialization`
                    );
                    return;
                }

                const success = storage.set(key, value);

                if (success) {
                    logger.log('Saved to storage');
                } else {
                    logger.error('Failed to save to storage (quota exceeded?)');
                }
            } catch (error) {
                logger.error('Error saving to storage:', error);
            }
        }, 100) // Debounce for 100ms
    ).current;

    // Save to storage whenever state changes
    useEffect(() => {
        saveToStorage(state);
    }, [state, saveToStorage]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Custom setState that works with updater functions
    const setStateWrapper = useCallback(
        (value: T | ((prev: T) => T)) => {
            setState((prev) => {
                const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
                return newValue;
            });
        },
        []
    );

    return [state, setStateWrapper];
}

/**
 * Hook to clear prunable state from storage
 */
export function useClearPrunableState() {
    const storage = useRef(createStorageAdapter()).current;

    return useCallback(
        (key: string) => {
            storage.remove(key);
        },
        [storage]
    );
}

/**
 * Hook to get storage usage information
 */
export function useStorageUsage() {
    const storage = useRef(createStorageAdapter()).current;
    const [usage, setUsage] = useState(() => storage.getUsage());

    useEffect(() => {
        const interval = setInterval(() => {
            setUsage(storage.getUsage());
        }, 5000); // Update every 5 seconds

        return () => clearInterval(interval);
    }, [storage]);

    return usage;
}
