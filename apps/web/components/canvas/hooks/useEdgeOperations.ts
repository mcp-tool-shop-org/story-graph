'use client';

import { useCallback } from 'react';
import type { Connection, Edge } from '@xyflow/react';

interface EdgeOperation {
  type: 'add' | 'remove';
  source: string;
  target: string;
  sourceHandle?: string | null | undefined;
  targetHandle?: string | null | undefined;
}

interface UseEdgeOperationsOptions {
  /**
   * Callback when edges are added or removed
   */
  onEdgeOperation: (operation: EdgeOperation) => void;
}

/**
 * Hook for managing edge creation and deletion in the canvas.
 */
export function useEdgeOperations({ onEdgeOperation }: UseEdgeOperationsOptions) {
  /**
   * Handle new connection from React Flow
   */
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Prevent self-connections
      if (connection.source === connection.target) {
        console.warn('Cannot connect node to itself');
        return;
      }

      onEdgeOperation({
        type: 'add',
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      });
    },
    [onEdgeOperation]
  );

  /**
   * Handle edge deletion
   */
  const handleEdgeDelete = useCallback(
    (edges: Edge[]) => {
      for (const edge of edges) {
        onEdgeOperation({
          type: 'remove',
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        });
      }
    },
    [onEdgeOperation]
  );

  /**
   * Validate if a connection is allowed
   */
  const isValidConnection = useCallback((connection: Connection) => {
    // No self-connections
    if (connection.source === connection.target) {
      return false;
    }

    // Could add more validation here (e.g., prevent cycles, type compatibility)
    return true;
  }, []);

  return {
    handleConnect,
    handleEdgeDelete,
    isValidConnection,
  };
}
