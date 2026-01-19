import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
    cleanup();
    sessionStorage.clear();
});

// Mock performance.memory for tests
if (typeof performance !== 'undefined' && !('memory' in performance)) {
    Object.defineProperty(performance, 'memory', {
        configurable: true,
        get: () => ({
            usedJSHeapSize: 100 * 1024 * 1024, // 100MB
            totalJSHeapSize: 200 * 1024 * 1024,
            jsHeapSizeLimit: 2048 * 1024 * 1024,
        }),
    });
}
