import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';

// GET /api/samples
export async function GET() {
  try {
    const db = await readDB();
    return NextResponse.json(db.samples);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read samples' }, { status: 500 });
  }
}

// POST /api/samples
export async function POST(request: Request) {
  try {
    const newSamples = await request.json();
    if (!Array.isArray(newSamples)) {
      return NextResponse.json({ error: 'Expected an array of samples' }, { status: 400 });
    }
    
    const db = await readDB();
    db.samples = [...db.samples, ...newSamples];
    await writeDB(db);
    
    return NextResponse.json({ success: true, count: newSamples.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add samples' }, { status: 500 });
  }
}
