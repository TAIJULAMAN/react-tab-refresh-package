import type {
    MonitorConfig,
    MonitorEvent,
    MonitorCallback,
    PruningMetrics,
} from '../types';
import {
    isPageVisibilitySupported,
    isPageVisible,
    getMemoryUsage,
    getDomNodeCount,
    createLogger,
} from '../utils/helpers';

/**
 * Monitors tab inactivity and resource usage
 * Emits events when thresholds are exceeded
 */
export class InactivityMonitor {
    private config: MonitorConfig;
    private logger: ReturnType<typeof createLogger>;
    private listeners: Map<MonitorEvent, Set<MonitorCallback>> = new Map();
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private hiddenAt: number | null = null;
    private isRunning = false;

    constructor(config: Partial<MonitorConfig>) {
        this.config = {
            maxInactivityMs: config.maxInactivityMs ?? 30 * 60 * 1000, // 30 minutes
            maxMemoryMb: config.maxMemoryMb,
            maxDomNodes: config.maxDomNodes,
            enableMemoryMonitoring: config.enableMemoryMonitoring ?? false,
            pollingInterval: config.pollingInterval ?? 30000, // 30 seconds
            debug: config.debug ?? false,
        };

        this.logger = createLogger('InactivityMonitor', this.config.debug);

        if (!isPageVisibilitySupported()) {
            this.logger.warn(
                'Page Visibility API not supported. Inactivity monitoring disabled.'
            );
        }
    }

    /**
     * Start monitoring
     */
    start(): void {
        if (this.isRunning) {
            this.logger.warn('Monitor already running');
            return;
        }

        if (!isPageVisibilitySupported()) {
            this.logger.error('Cannot start monitor: Page Visibility API not supported');
            return;
        }

        this.isRunning = true;
        this.setupVisibilityListener();
        this.startPolling();

        this.logger.log('Monitor started', {
            maxInactivityMs: this.config.maxInactivityMs,
            maxMemoryMb: this.config.maxMemoryMb,
            maxDomNodes: this.config.maxDomNodes,
        });
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        this.removeVisibilityListener();
        this.stopPolling();

        this.logger.log('Monitor stopped');
    }

    /**
     * Register event listener
     */
    on(event: MonitorEvent, callback: MonitorCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    /**
     * Unregister event listener
     */
    off(event: MonitorEvent, callback: MonitorCallback): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    /**
     * Get current metrics
     */
    getCurrentMetrics(): PruningMetrics {
        const inactiveMs = this.getInactiveTime();
        const memoryMb = this.config.enableMemoryMonitoring
            ? getMemoryUsage()
            : undefined;
        const domNodes = this.config.maxDomNodes ? getDomNodeCount() : undefined;

        return {
            inactiveMs,
            memoryMb,
            domNodes,
        };
    }

    /**
     * Check if any threshold is exceeded
     */
    private checkThresholds(): void {
        const metrics = this.getCurrentMetrics();
        let exceeded = false;
        const reasons: string[] = [];

        // Check inactivity threshold
        if (metrics.inactiveMs >= this.config.maxInactivityMs) {
            exceeded = true;
            reasons.push(
                `Inactivity: ${Math.round(metrics.inactiveMs / 1000)}s / ${Math.round(this.config.maxInactivityMs / 1000)}s`
            );
        }

        // Check memory threshold (if enabled and available)
        if (
            this.config.enableMemoryMonitoring &&
            this.config.maxMemoryMb &&
            metrics.memoryMb !== undefined &&
            metrics.memoryMb >= this.config.maxMemoryMb
        ) {
            exceeded = true;
            reasons.push(
                `Memory: ${metrics.memoryMb}MB / ${this.config.maxMemoryMb}MB`
            );
        }

        // Check DOM node threshold
        if (
            this.config.maxDomNodes &&
            metrics.domNodes !== undefined &&
            metrics.domNodes >= this.config.maxDomNodes
        ) {
            exceeded = true;
            reasons.push(
                `DOM Nodes: ${metrics.domNodes} / ${this.config.maxDomNodes}`
            );
        }

        if (exceeded) {
            this.logger.log('Threshold exceeded:', reasons.join(', '));
            this.emit('threshold-exceeded', metrics);
        }

        // Always emit metrics update
        this.emit('metrics-updated', metrics);
    }

    /**
     * Emit event to all listeners
     */
    private emit(event: MonitorEvent, metrics: PruningMetrics): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach((callback) => {
                try {
                    callback(metrics);
                } catch (error) {
                    this.logger.error(`Error in ${event} callback:`, error);
                }
            });
        }
    }

    /**
     * Set up visibility change listener
     */
    private setupVisibilityListener(): void {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    /**
     * Remove visibility change listener
     */
    private removeVisibilityListener(): void {
        document.removeEventListener(
            'visibilitychange',
            this.handleVisibilityChange
        );
    }

    /**
     * Handle visibility change event
     */
    private handleVisibilityChange = (): void => {
        const isVisible = isPageVisible();

        if (isVisible) {
            this.logger.log('Tab became visible');
            this.hiddenAt = null;
        } else {
            this.logger.log('Tab became hidden');
            this.hiddenAt = Date.now();
        }
    };

    /**
     * Get time since tab became hidden
     */
    private getInactiveTime(): number {
        if (!this.hiddenAt || isPageVisible()) {
            return 0;
        }
        return Date.now() - this.hiddenAt;
    }

    /**
     * Start polling for threshold checks
     */
    private startPolling(): void {
        if (this.intervalId) {
            return;
        }

        this.intervalId = setInterval(() => {
            if (!isPageVisible()) {
                this.checkThresholds();
            }
        }, this.config.pollingInterval);
    }

    /**
     * Stop polling
     */
    private stopPolling(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<MonitorConfig>): void {
        this.config = { ...this.config, ...config };
        this.logger.log('Config updated', this.config);
    }

    /**
     * Reset monitor state
     */
    reset(): void {
        this.hiddenAt = null;
        this.logger.log('Monitor reset');
    }
}
