'use client';

import { useState, useEffect, useRef } from 'react';

interface RuntimeEvent {
  type: string;
  nodeId?: string | undefined;
  timestamp?: number | undefined;
  data?: Record<string, unknown> | undefined;
}

interface EventLogProps {
  events: RuntimeEvent[];
  collapsed?: boolean;
  maxEvents?: number;
}

/**
 * Displays runtime events in a scrollable log panel.
 */
export function EventLog({ events, collapsed = false, maxEvents = 50 }: EventLogProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const logRef = useRef<HTMLUListElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (logRef.current && !isCollapsed) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events, isCollapsed]);

  // Limit displayed events
  const displayedEvents = events.slice(-maxEvents);

  const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'node_enter':
        return '→';
      case 'node_exit':
        return '←';
      case 'choice_made':
        return '◆';
      case 'variable_set':
        return '=';
      case 'condition_evaluated':
        return '?';
      case 'story_end':
        return '■';
      default:
        return '•';
    }
  };

  const getEventClass = (type: string): string => {
    switch (type) {
      case 'node_enter':
        return 'event-enter';
      case 'node_exit':
        return 'event-exit';
      case 'choice_made':
        return 'event-choice';
      case 'variable_set':
        return 'event-variable';
      case 'condition_evaluated':
        return 'event-condition';
      case 'story_end':
        return 'event-end';
      default:
        return 'event-default';
    }
  };

  const formatEventData = (event: RuntimeEvent): string => {
    const parts: string[] = [];

    if (event.nodeId) {
      parts.push(`[${event.nodeId}]`);
    }

    if (event.data) {
      const dataStr = Object.entries(event.data)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(', ');
      if (dataStr) parts.push(dataStr);
    }

    return parts.join(' ');
  };

  return (
    <div className="event-log">
      <button
        className="event-log-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
      >
        <span className="event-log-title">
          Event Log
          <span className="event-count">{events.length}</span>
        </span>
        <span className="event-log-toggle">{isCollapsed ? '▶' : '▼'}</span>
      </button>

      {!isCollapsed && (
        <ul ref={logRef} className="event-log-content">
          {displayedEvents.length === 0 ? (
            <li className="event-empty">No events yet</li>
          ) : (
            displayedEvents.map((event, index) => (
              <li key={index} className={`event-item ${getEventClass(event.type)}`}>
                <span className="event-icon">{getEventIcon(event.type)}</span>
                <span className="event-type">{event.type}</span>
                <span className="event-data">{formatEventData(event)}</span>
                {event.timestamp && (
                  <span className="event-time">{formatTimestamp(event.timestamp)}</span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
