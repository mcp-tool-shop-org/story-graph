const MAX_STORY_BYTES = Number(process.env.STORYGRAPH_MAX_STORY_BYTES ?? 512 * 1024);
const MAX_STORY_NODES = Number(process.env.STORYGRAPH_MAX_NODES ?? 1000);

export function enforceLimits(content: string, nodeCount: number): void {
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > MAX_STORY_BYTES) {
    const err = new Error(`Story exceeds max size of ${MAX_STORY_BYTES} bytes`);
    err.name = 'PayloadTooLargeError';
    throw err;
  }
  if (nodeCount > MAX_STORY_NODES) {
    const err = new Error(`Story exceeds max nodes (${MAX_STORY_NODES})`);
    err.name = 'StoryTooLargeError';
    throw err;
  }
}
