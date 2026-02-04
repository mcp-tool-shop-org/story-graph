'use client';

import { useCallback, useRef } from 'react';

interface Position {
  x: number;
  y: number;
}

interface PositionUpdate {
  nodeId: string;
  position: Position;
}

interface UsePositionSyncOptions {
  /**
   * Callback to persist positions (e.g., update Story object and serialize to YAML)
   */
  onPositionsUpdate: (updates: Map<string, Position>) => void;
  /**
   * Debounce delay in milliseconds
   */
  debounceMs?: number;
}

/**
 * Hook for managing debounced position updates from React Flow.
 * Batches multiple position changes and persists them after a delay.
 */
export function usePositionSync({ onPositionsUpdate, debounceMs = 300 }: UsePositionSyncOptions) {
  const pendingUpdates = useRef<Map<string, Position>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushUpdates = useCallback(() => {
    if (pendingUpdates.current.size > 0) {
      onPositionsUpdate(new Map(pendingUpdates.current));
      pendingUpdates.current.clear();
    }
  }, [onPositionsUpdate]);

  const scheduleFlush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(flushUpdates, debounceMs);
  }, [flushUpdates, debounceMs]);

  const updatePosition = useCallback(
    (nodeId: string, position: Position) => {
      pendingUpdates.current.set(nodeId, {
        x: Math.round(position.x),
        y: Math.round(position.y),
      });
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const updatePositions = useCallback(
    (updates: PositionUpdate[]) => {
      for (const update of updates) {
        pendingUpdates.current.set(update.nodeId, {
          x: Math.round(update.position.x),
          y: Math.round(update.position.y),
        });
      }
      scheduleFlush();
    },
    [scheduleFlush]
  );

  // Force immediate flush (useful before saving)
  const forceFlush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    flushUpdates();
  }, [flushUpdates]);

  return {
    updatePosition,
    updatePositions,
    forceFlush,
  };
}
