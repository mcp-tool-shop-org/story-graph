'use client';

import { useState } from 'react';

interface VariablePanelProps {
  variables: Record<string, string | number | boolean>;
  collapsed?: boolean;
}

/**
 * Displays runtime variables in a collapsible panel.
 */
export function VariablePanel({ variables, collapsed = false }: VariablePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const entries = Object.entries(variables);

  const formatValue = (value: string | number | boolean): string => {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
  };

  const getValueClass = (value: string | number | boolean): string => {
    if (typeof value === 'boolean') return 'var-boolean';
    if (typeof value === 'number') return 'var-number';
    return 'var-string';
  };

  return (
    <div className="variable-panel">
      <button
        className="variable-panel-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
      >
        <span className="variable-panel-title">
          Variables
          <span className="variable-count">{entries.length}</span>
        </span>
        <span className="variable-panel-toggle">{isCollapsed ? '▶' : '▼'}</span>
      </button>

      {!isCollapsed && (
        <div className="variable-panel-content">
          {entries.length === 0 ? (
            <p className="variable-empty">No variables set</p>
          ) : (
            <ul className="variable-list">
              {entries.map(([key, value]) => (
                <li key={key} className="variable-item">
                  <span className="variable-name">{key}</span>
                  <span className={`variable-value ${getValueClass(value)}`}>
                    {formatValue(value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
