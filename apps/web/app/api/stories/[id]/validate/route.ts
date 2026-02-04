import { NextResponse } from 'next/server';
import { storyStore } from '../../../../../lib/story-store';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content : storyStore.get(params.id)?.content ?? '';
    const result = storyStore.validate(content);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
