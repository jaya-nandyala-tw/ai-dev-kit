import { useCallback, useEffect, useState } from "react";

const STEP_STATE_KEY = "onboarding-step-state";

export function useStepState<T>(stepId: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STEP_STATE_KEY);
    if (stored) {
      try {
        const stateMap = JSON.parse(stored) as Record<string, unknown>;
        if (stepId in stateMap) {
          setState(stateMap[stepId] as T);
        }
      } catch {
        // Ignore parse errors
      }
    }
    setLoaded(true);
  }, [stepId]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!loaded) return;

    const stored = localStorage.getItem(STEP_STATE_KEY);
    const stateMap = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
    stateMap[stepId] = state;
    localStorage.setItem(STEP_STATE_KEY, JSON.stringify(stateMap));
  }, [state, stepId, loaded]);

  const setStateWrapper = useCallback((value: T | ((prev: T) => T)) => {
    if (typeof value === "function") {
      setState((prev) => {
        const next = (value as (prev: T) => T)(prev);
        return next;
      });
    } else {
      setState(value);
    }
  }, []);

  return [state, setStateWrapper];
}

export function clearStepState(): void {
  localStorage.removeItem(STEP_STATE_KEY);
}

export function clearStepStateForStep(stepId: string): void {
  const stored = localStorage.getItem(STEP_STATE_KEY);
  if (stored) {
    try {
      const stateMap = JSON.parse(stored) as Record<string, unknown>;
      delete stateMap[stepId];
      localStorage.setItem(STEP_STATE_KEY, JSON.stringify(stateMap));
    } catch {
      // Ignore parse errors
    }
  }
}
