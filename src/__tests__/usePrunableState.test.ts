import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrunableState } from '../hooks/usePrunableState';

describe('usePrunableState', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('should initialize with initial value', () => {
        const { result } = renderHook(() =>
            usePrunableState('test-key', 'initial')
        );

        expect(result.current[0]).toBe('initial');
    });

    it('should update state', () => {
        const { result } = renderHook(() =>
            usePrunableState('test-key', 'initial')
        );

        act(() => {
            result.current[1]('updated');
        });

        expect(result.current[0]).toBe('updated');
    });

    it('should persist state to sessionStorage', async () => {
        const { result } = renderHook(() =>
            usePrunableState('test-key', { count: 0 })
        );

        act(() => {
            result.current[1]({ count: 42 });
        });

        // Wait for debounce
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Check sessionStorage
        const stored = sessionStorage.getItem('rtr_test-key');
        expect(stored).toBeTruthy();

        const parsed = JSON.parse(stored!);
        expect(parsed.value).toEqual({ count: 42 });
    });

    it('should restore state from sessionStorage', () => {
        // Pre-populate storage
        const metadata = {
            value: { count: 99 },
            timestamp: Date.now(),
            version: '1.0.0',
        };
        sessionStorage.setItem('rtr_test-key', JSON.stringify(metadata));

        const { result } = renderHook(() =>
            usePrunableState('test-key', { count: 0 })
        );

        expect(result.current[0]).toEqual({ count: 99 });
    });

    it('should use initial value if stored data is invalid', () => {
        // Store invalid JSON
        sessionStorage.setItem('rtr_test-key', 'invalid-json');

        const { result } = renderHook(() =>
            usePrunableState('test-key', 'fallback')
        );

        expect(result.current[0]).toBe('fallback');
    });

    it('should support updater function', () => {
        const { result } = renderHook(() => usePrunableState('test-key', 10));

        act(() => {
            result.current[1]((prev: number) => prev + 5);
        });

        expect(result.current[0]).toBe(15);
    });

    it('should validate restored data', () => {
        const metadata = {
            value: { userId: null },
            timestamp: Date.now(),
            version: '1.0.0',
        };
        sessionStorage.setItem('rtr_test-key', JSON.stringify(metadata));

        const { result } = renderHook(() =>
            usePrunableState(
                'test-key',
                { userId: 'default' },
                {
                    validate: (value) => value.userId !== null,
                }
            )
        );

        // Should use initial value because validation failed
        expect(result.current[0]).toEqual({ userId: 'default' });
    });

    it('should handle TTL expiration', () => {
        const metadata = {
            value: 'old-data',
            timestamp: Date.now() - 2000, // 2 seconds ago
            version: '1.0.0',
        };
        sessionStorage.setItem('rtr_test-key', JSON.stringify(metadata));

        const onExpired = vi.fn();

        const { result } = renderHook(() =>
            usePrunableState('test-key', 'fresh-data', {
                ttl: 1000, // 1 second TTL
                onExpired,
            })
        );

        // Should use initial value because data expired
        expect(result.current[0]).toBe('fresh-data');
        expect(onExpired).toHaveBeenCalled();
    });

    it('should handle complex objects', async () => {
        const complexData = {
            user: { name: 'John', age: 30 },
            items: [1, 2, 3],
            nested: { deep: { value: 'test' } },
        };

        const { result } = renderHook(() =>
            usePrunableState('test-key', complexData)
        );

        act(() => {
            result.current[1]({
                ...complexData,
                user: { name: 'Jane', age: 25 },
            });
        });

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(result.current[0].user.name).toBe('Jane');
    });
});
