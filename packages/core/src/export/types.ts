import type { Story } from '../core/story.js';

export interface ExportFile {
  name: string;
  contents: string;
}

export interface ExportWarning {
  code: string;
  message: string;
  nodeId?: string;
  details?: Record<string, unknown>;
}

export interface ExportOptions {
  tier?: 0 | 1 | 2;
}

export interface ExportResult {
  files: ExportFile[];
  warnings: ExportWarning[];
}

export interface Exporter {
  target: string;
  export(story: Story, options?: ExportOptions): ExportResult;
}

export function addWarning(list: ExportWarning[], warning: ExportWarning): void {
  list.push(warning);
}
