import { NextResponse } from 'next/server';
import { storyStore } from '../../../lib/story-store';

export async function GET() {
  return NextResponse.json({ stories: storyStore.list() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content : '';
    const title = typeof body.title === 'string' ? body.title : undefined;
    const record = storyStore.create(content, title);
    return NextResponse.json({ story: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
