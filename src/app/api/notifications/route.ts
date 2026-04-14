import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';

// GET /api/notifications
export async function GET() {
  try {
    const db = await readDB();
    return NextResponse.json(db.notifications);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read notifications' }, { status: 500 });
  }
}

// POST /api/notifications
export async function POST(request: Request) {
  try {
    const notification = await request.json();
    const db = await readDB();
    db.notifications = [notification, ...db.notifications];
    await writeDB(db);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add notification' }, { status: 500 });
  }
}
