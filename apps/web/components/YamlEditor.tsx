'use client';

import { useCallback, useRef, useEffect } from 'react';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

/**
 * YAML editor component with syntax highlighting via textarea.
 * Future: Replace with Monaco or CodeMirror for full syntax highlighting.
 */
export function YamlEditor({ value, onChange, readOnly = false }: YamlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // Handle tab key for indentation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea || readOnly) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (e.shiftKey) {
          // Unindent: remove 2 spaces from start of line
          const beforeCursor = value.substring(0, start);
          const lineStart = beforeCursor.lastIndexOf('\n') + 1;
          const lineContent = value.substring(lineStart);

          if (lineContent.startsWith('  ')) {
            const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2);
            onChange(newValue);
            // Move cursor back
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 2);
            }, 0);
          }
        } else {
          // Indent: insert 2 spaces
          const newValue = value.substring(0, start) + '  ' + value.substring(end);
          onChange(newValue);
          // Move cursor forward
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          }, 0);
        }
      }
    },
    [value, onChange, readOnly]
  );

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(400, textarea.scrollHeight)}px`;
    }
  }, [value]);

  return (
    <div className="yaml-editor-container">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        className="yaml-editor"
        placeholder="Enter YAML content..."
      />
    </div>
  );
}
