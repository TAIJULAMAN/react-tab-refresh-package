import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PruneProviderProps, PruningContextValue, PruningMetrics } from '../types';
import { PruningContext } from '../context/PruningContext';
import { InactivityMonitor } from '../core/InactivityMonitor';
import { parseTime, createLogger, isPageVisible } from '../utils/helpers';

/**
 * Provider component that orchestrates pruning and rehydration
 *
 * @example
 * ```tsx
 * <PruneProvider config={{ pruneAfter: '30m' }}>
 *   <App />
 * </PruneProvider>
 * ```
 */
export function PruneProvider({
    children,
    config = {},
    placeholder,
}: PruneProviderProps) {
    const {
        pruneAfter = '30m',
        maxMemoryMb,
        enableMemoryMonitoring = false,
        maxDomNodes,
        onPrune,
        onRehydrate,
        debug = false,
    } = config;

    const logger = createLogger('PruneProvider', debug);
    const [isPruned, setIsPruned] = useState(false);
    const [isRehydrating, setIsRehydrating] = useState(false);
    const [metrics, setMetrics] = useState<PruningMetrics>({
        inactiveMs: 0,
    });

    const monitorRef = useRef<InactivityMonitor | null>(null);
    const cleanupHandlers = useRef<Map<string, () => void | Promise<void>>>(new Map());

    // Initialize monitor
    useEffect(() => {
        const maxInactivityMs = parseTime(pruneAfter);

        const monitor = new InactivityMonitor({
            maxInactivityMs,
            maxMemoryMb,
            enableMemoryMonitoring,
            maxDomNodes,
            debug,
        });

        monitorRef.current = monitor;

        // Listen for threshold exceeded
        monitor.on('threshold-exceeded', handleThresholdExceeded);

        // Listen for metrics updates
        monitor.on('metrics-updated', (newMetrics) => {
            setMetrics(newMetrics);
        });

        // Start monitoring
        monitor.start();

        logger.log('Provider initialized', {
            pruneAfter: maxInactivityMs,
            maxMemoryMb,
            maxDomNodes,
        });

        return () => {
            monitor.stop();
        };
    }, [pruneAfter, maxMemoryMb, enableMemoryMonitoring, maxDomNodes, debug]);

    // Listen for visibility changes to trigger rehydration
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (isPageVisible() && isPruned) {
                logger.log('Tab became visible, triggering rehydration');
                await handleRehydrate();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isPruned]);

    /**
     * Handle threshold exceeded - trigger pruning
     */
    const handleThresholdExceeded = useCallback(
        async (newMetrics: PruningMetrics) => {
            if (isPruned) {
                return; // Already pruned
            }

            logger.log('Threshold exceeded, starting prune process', newMetrics);

            try {
                // Call user's onPrune callback
                if (onPrune) {
                    await onPrune();
                }

                // Call all registered cleanup handlers
                for (const [key, cleanup] of cleanupHandlers.current.entries()) {
                    try {
                        logger.log(`Running cleanup handler: ${key}`);
                        await cleanup();
                    } catch (error) {
                        logger.error(`Cleanup handler "${key}" failed:`, error);
                    }
                }

                // Set pruned state (this will unmount children)
                setIsPruned(true);
                setMetrics((prev) => ({ ...prev, lastPruneAt: Date.now() }));

                logger.log('Prune complete');
            } catch (error) {
                logger.error('Error during prune:', error);
            }
        },
        [isPruned, onPrune, logger]
    );

    /**
     * Handle rehydration - restore the app
     */
    const handleRehydrate = useCallback(async () => {
        if (!isPruned) {
            return;
        }

        logger.log('Starting rehydration');
        setIsRehydrating(true);

        try {
            // Small delay to show placeholder if provided
            if (placeholder) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            // Restore state (happens automatically via usePrunableState)
            setIsPruned(false);

            // Call user's onRehydrate callback
            if (onRehydrate) {
                await onRehydrate();
            }

            setMetrics((prev) => ({ ...prev, lastRehydrateAt: Date.now() }));

            logger.log('Rehydration complete');
        } catch (error) {
            logger.error('Error during rehydration:', error);
        } finally {
            setIsRehydrating(false);
        }
    }, [isPruned, onRehydrate, placeholder, logger]);

    /**
     * Force immediate rehydration
     */
    const forceRehydrate = useCallback(() => {
        logger.log('Force rehydration requested');
        handleRehydrate();
    }, [handleRehydrate, logger]);

    /**
     * Register cleanup handler
     */
    const registerCleanup = useCallback(
        (key: string, cleanup: () => void | Promise<void>) => {
            logger.log(`Registered cleanup handler: ${key}`);
            cleanupHandlers.current.set(key, cleanup);
        },
        [logger]
    );

    /**
     * Unregister cleanup handler
     */
    const unregisterCleanup = useCallback(
        (key: string) => {
            logger.log(`Unregistered cleanup handler: ${key}`);
            cleanupHandlers.current.delete(key);
        },
        [logger]
    );

    const contextValue: PruningContextValue = {
        isPruned,
        isRehydrating,
        metrics,
        forceRehydrate,
        registerCleanup,
        unregisterCleanup,
    };

    // If pruned, show nothing (or placeholder during rehydration)
    if (isPruned) {
        if (isRehydrating && placeholder) {
            return <>{placeholder}</>;
        }
        return null;
    }

    return (
        <PruningContext.Provider value={contextValue}>
            {children}
        </PruningContext.Provider>
    );
}
