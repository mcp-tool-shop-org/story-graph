'use client';

import type { Issue } from '@storygraph/core';

interface ValidationStatusBadgeProps {
  issues: Issue[];
  parseError?: string | undefined;
  onClick?: (() => void) | undefined;
}

/**
 * Compact validation status indicator for headers/toolbars.
 * Shows red (errors), yellow (warnings), or green (valid).
 */
export function ValidationStatusBadge({ issues, parseError, onClick }: ValidationStatusBadgeProps) {
  const errorCount = parseError ? 1 : issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  // Determine status
  let status: 'valid' | 'warning' | 'error' = 'valid';
  let icon = '✓';
  let label = 'Valid';
  let title = 'Story is valid';

  if (parseError) {
    status = 'error';
    icon = '✕';
    label = 'Parse Error';
    title = `Parse error: ${parseError}`;
  } else if (errorCount > 0) {
    status = 'error';
    icon = '✕';
    label = errorCount === 1 ? '1 error' : `${errorCount} errors`;
    title = `${errorCount} error${errorCount > 1 ? 's' : ''} found`;
  } else if (warningCount > 0) {
    status = 'warning';
    icon = '!';
    label = warningCount === 1 ? '1 warning' : `${warningCount} warnings`;
    title = `${warningCount} warning${warningCount > 1 ? 's' : ''} found`;
  } else if (infoCount > 0) {
    label = 'Valid';
    title = `Valid with ${infoCount} suggestion${infoCount > 1 ? 's' : ''}`;
  }

  return (
    <button
      type="button"
      className={`validation-status-badge validation-status-${status}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <span className="validation-status-icon">{icon}</span>
      <span className="validation-status-label">{label}</span>
    </button>
  );
}
