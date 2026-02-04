'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseToStory, serializeStoryInstance, type Story, type StoryNode } from '@storygraph/core';

interface UseStoryGraphOptions {
  /**
   * Initial YAML content
   */
  initialYaml?: string;
  /**
   * Callback when YAML should be updated
   */
  onYamlChange?: (yaml: string) => void;
  /**
   * Debounce delay for YAML → Story parsing
   */
  parseDebounceMs?: number;
}

interface UseStoryGraphResult {
  /**
   * Current Story object (null if parsing failed)
   */
  story: Story | null;
  /**
   * Parse error message if any
   */
  parseError: string | null;
  /**
   * Current YAML content
   */
  yaml: string;
  /**
   * Update YAML content (will trigger re-parse)
   */
  setYaml: (yaml: string) => void;
  /**
   * Update node position in Story
   */
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  /**
   * Update multiple node positions
   */
  updateNodePositions: (positions: Map<string, { x: number; y: number }>) => void;
  /**
   * Serialize current Story to YAML
   */
  serializeToYaml: () => string | null;
}

/**
 * Hook for managing bidirectional sync between YAML and Story object.
 */
export function useStoryGraph({
  initialYaml = '',
  onYamlChange,
  parseDebounceMs = 300,
}: UseStoryGraphOptions = {}): UseStoryGraphResult {
  const [yaml, setYamlState] = useState(initialYaml);
  const [story, setStory] = useState<Story | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const parseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingFromCanvas = useRef(false);

  // Parse YAML to Story (debounced)
  useEffect(() => {
    // Skip if this change came from canvas
    if (isUpdatingFromCanvas.current) {
      isUpdatingFromCanvas.current = false;
      return;
    }

    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }

    parseTimeoutRef.current = setTimeout(() => {
      try {
        const parsed = parseToStory(yaml);
        setStory(parsed);
        setParseError(null);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : String(err));
        // Keep previous story on parse error
      }
    }, parseDebounceMs);

    return () => {
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }
    };
  }, [yaml, parseDebounceMs]);

  // Set YAML and notify parent
  const setYaml = useCallback(
    (newYaml: string) => {
      setYamlState(newYaml);
      onYamlChange?.(newYaml);
    },
    [onYamlChange]
  );

  // Update single node position
  const updateNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      if (!story) return;

      const node = story.getNode(nodeId);
      if (!node) return;

      // Update node with position
      const updatedNode: StoryNode = {
        ...node,
        position: { x: position.x, y: position.y },
      };

      story.setNode(updatedNode);

      // Serialize back to YAML
      isUpdatingFromCanvas.current = true;
      const newYaml = serializeStoryInstance(story);
      setYamlState(newYaml);
      onYamlChange?.(newYaml);
    },
    [story, onYamlChange]
  );

  // Update multiple node positions
  const updateNodePositions = useCallback(
    (positions: Map<string, { x: number; y: number }>) => {
      if (!story) return;

      for (const [nodeId, position] of positions) {
        const node = story.getNode(nodeId);
        if (node) {
          const updatedNode: StoryNode = {
            ...node,
            position: { x: position.x, y: position.y },
          };
          story.setNode(updatedNode);
        }
      }

      // Serialize back to YAML
      isUpdatingFromCanvas.current = true;
      const newYaml = serializeStoryInstance(story);
      setYamlState(newYaml);
      onYamlChange?.(newYaml);
    },
    [story, onYamlChange]
  );

  // Serialize to YAML on demand
  const serializeToYaml = useCallback(() => {
    if (!story) return null;
    return serializeStoryInstance(story);
  }, [story]);

  return {
    story,
    parseError,
    yaml,
    setYaml,
    updateNodePosition,
    updateNodePositions,
    serializeToYaml,
  };
}
