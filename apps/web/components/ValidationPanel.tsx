'use client';

import type { Issue } from '@storygraph/core';

interface ValidationPanelProps {
  issues: Issue[];
  parseError?: string | undefined;
  isValidating?: boolean;
}

/**
 * Displays validation results including parse errors and issues.
 */
export function ValidationPanel({
  issues,
  parseError,
  isValidating = false,
}: ValidationPanelProps) {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  if (isValidating) {
    return (
      <div className="validation-panel">
        <div className="validation-status validating">
          <span className="spinner-small" />
          <span>Validating...</span>
        </div>
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="validation-panel">
        <div className="validation-status error">
          <span className="validation-icon">✗</span>
          <span>Parse Error</span>
        </div>
        <div className="alert error">{parseError}</div>
      </div>
    );
  }

  const hasIssues = issues.length > 0;
  const hasErrors = errors.length > 0;

  return (
    <div className="validation-panel">
      <div
        className={`validation-status ${hasErrors ? 'error' : hasIssues ? 'warning' : 'success'}`}
      >
        <span className="validation-icon">{hasErrors ? '✗' : hasIssues ? '⚠' : '✓'}</span>
        <span>
          {hasErrors
            ? `${errors.length} error${errors.length > 1 ? 's' : ''}`
            : hasIssues
              ? `${warnings.length} warning${warnings.length > 1 ? 's' : ''}, ${infos.length} info`
              : 'Valid'}
        </span>
      </div>

      {issues.length > 0 && (
        <ul className="issues">
          {errors.map((issue, idx) => (
            <IssueItem key={`error-${idx}`} issue={issue} />
          ))}
          {warnings.map((issue, idx) => (
            <IssueItem key={`warning-${idx}`} issue={issue} />
          ))}
          {infos.map((issue, idx) => (
            <IssueItem key={`info-${idx}`} issue={issue} />
          ))}
        </ul>
      )}

      {!hasIssues && (
        <div className="alert success">
          <span className="validation-icon">✓</span>
          No issues found. Story is valid!
        </div>
      )}
    </div>
  );
}

function IssueItem({ issue }: { issue: Issue }) {
  return (
    <li className={`issue-item ${issue.severity}`}>
      <span className={`pill ${issue.severity}`}>{issue.severity}</span>
      <span className="issue-code">{issue.code}</span>
      <span className="issue-message">{issue.message}</span>
      {issue.nodeId && <span className="issue-node">[{issue.nodeId}]</span>}
    </li>
  );
}
