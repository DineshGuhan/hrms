import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('start', 300));
    expect(result.current).toBe('start');
  });

  it('delays updates until the delay elapses', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'first' },
    });
    rerender({ v: 'second' });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('first');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('second');
    vi.useRealTimers();
  });

  it('ignores rapid changes and settles on the last value', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }: { v: number }) => useDebouncedValue(v, 300), {
      initialProps: { v: 0 },
    });
    rerender({ v: 1 });
    rerender({ v: 2 });
    rerender({ v: 3 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(3);
    vi.useRealTimers();
  });
});
