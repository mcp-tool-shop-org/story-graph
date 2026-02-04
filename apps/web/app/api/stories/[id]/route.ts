import { NextResponse } from 'next/server';
import { storyStore } from '../../../../lib/story-store';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const story = storyStore.get(params.id);
  if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ story });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content : '';
    const updated = storyStore.save(params.id, content);
    return NextResponse.json({ story: updated });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
