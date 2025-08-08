

import { renderHook, act } from '@testing-library/react-native';
import { useTimer } from '../useTimer';

describe('useTimer', () => {
  it('should have the correct initial state', () => {
    const { result } = renderHook(() => useTimer());

    expect(result.current.activeSession).toBeNull();
    expect(result.current.log).toEqual([]);
    expect(result.current.settings.workDuration).toBe(25);
  });

  it('should start the timer', () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.startTimer();
    });

    expect(result.current.activeSession?.isRunning).toBe(true);
  });

  it('should pause the timer', () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      result.current.pauseTimer();
    });

    expect(result.current.activeSession?.isRunning).toBe(false);
  });

  it('should reset the timer', () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      result.current.resetTimer();
    });

    expect(result.current.activeSession?.isRunning).toBe(false);
    expect(result.current.activeSession?.currentTime).toBe(1500);
  });
});

