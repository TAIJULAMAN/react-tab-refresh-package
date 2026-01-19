import type {
    StorageAdapter,
    StorageUsage,
    StoredStateMetadata,
} from '../types';
import {
    createStorageKey,
    safeSerialize,
    safeDeserialize,
    createLogger,
} from './helpers';

/**
 * SessionStorage adapter with quota management and error handling
 */
export class SessionStorageAdapter implements StorageAdapter {
    private logger = createLogger('SessionStorage', false);

    /**
     * Get a value from sessionStorage
     */
    get<T>(key: string): T | null {
        try {
            const storageKey = createStorageKey(key);
            const item = sessionStorage.getItem(storageKey);

            if (!item) {
                return null;
            }

            const metadata: StoredStateMetadata = safeDeserialize(item);

            if (!metadata) {
                this.logger.warn(`Failed to parse stored data for key: ${key}`);
                return null;
            }

            return metadata.value as T;
        } catch (error) {
            this.logger.error(`Failed to get item from storage:`, error);
            return null;
        }
    }

    /**
     * Set a value in sessionStorage
     */
    set<T>(key: string, value: T): boolean {
        try {
            const storageKey = createStorageKey(key);
            const metadata: StoredStateMetadata = {
                value,
                timestamp: Date.now(),
                version: '1.0.0',
            };

            const serialized = safeSerialize(metadata);

            if (!serialized) {
                this.logger.error(
                    `Cannot serialize value for key "${key}". Value contains non-serializable data.`
                );
                return false;
            }

            sessionStorage.setItem(storageKey, serialized);
            return true;
        } catch (error) {
            // Check for quota exceeded error
            if (
                error instanceof DOMException &&
                (error.name === 'QuotaExceededError' ||
                    error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
            ) {
                this.logger.error(
                    `SessionStorage quota exceeded. Consider reducing state size or implementing cleanup.`
                );
            } else {
                this.logger.error(`Failed to set item in storage:`, error);
            }
            return false;
        }
    }

    /**
     * Remove a value from sessionStorage
     */
    remove(key: string): void {
        try {
            const storageKey = createStorageKey(key);
            sessionStorage.removeItem(storageKey);
        } catch (error) {
            this.logger.error(`Failed to remove item from storage:`, error);
        }
    }

    /**
     * Clear all react-tab-refresh data from sessionStorage
     */
    clear(): void {
        try {
            const keys = Object.keys(sessionStorage);
            const rtrKeys = keys.filter((key) => key.startsWith('rtr_'));

            rtrKeys.forEach((key) => {
                sessionStorage.removeItem(key);
            });

            this.logger.log(`Cleared ${rtrKeys.length} items from storage`);
        } catch (error) {
            this.logger.error(`Failed to clear storage:`, error);
        }
    }

    /**
     * Get storage usage information
     */
    getUsage(): StorageUsage {
        try {
            let used = 0;
            const keys = Object.keys(sessionStorage);

            keys.forEach((key) => {
                const value = sessionStorage.getItem(key);
                if (value) {
                    used += key.length + value.length;
                }
            });

            // SessionStorage typical limit is 5-10MB, we'll use 5MB as conservative estimate
            const available = 5 * 1024 * 1024; // 5MB in bytes
            const percentage = (used / available) * 100;

            return {
                used,
                available,
                percentage: Math.min(percentage, 100),
            };
        } catch (error) {
            this.logger.error(`Failed to get storage usage:`, error);
            return {
                used: 0,
                available: 0,
                percentage: 0,
            };
        }
    }

    /**
     * Get metadata for a stored item
     */
    getMetadata(key: string): StoredStateMetadata | null {
        try {
            const storageKey = createStorageKey(key);
            const item = sessionStorage.getItem(storageKey);

            if (!item) {
                return null;
            }

            return safeDeserialize<StoredStateMetadata>(item);
        } catch (error) {
            this.logger.error(`Failed to get metadata:`, error);
            return null;
        }
    }

    /**
     * Check if a stored item has expired based on TTL
     */
    isExpired(key: string, ttl: number): boolean {
        const metadata = this.getMetadata(key);

        if (!metadata) {
            return true;
        }

        const age = Date.now() - metadata.timestamp;
        return age > ttl;
    }

    /**
     * Clean up expired items
     */
    cleanupExpired(ttl: number): number {
        try {
            const keys = Object.keys(sessionStorage);
            const rtrKeys = keys.filter((key) => key.startsWith('rtr_'));
            let cleaned = 0;

            rtrKeys.forEach((storageKey) => {
                const key = storageKey.replace('rtr_', '');
                if (this.isExpired(key, ttl)) {
                    sessionStorage.removeItem(storageKey);
                    cleaned++;
                }
            });

            if (cleaned > 0) {
                this.logger.log(`Cleaned up ${cleaned} expired items`);
            }

            return cleaned;
        } catch (error) {
            this.logger.error(`Failed to cleanup expired items:`, error);
            return 0;
        }
    }
}

/**
 * Create a storage adapter instance
 */
export function createStorageAdapter(): StorageAdapter {
    return new SessionStorageAdapter();
}
