import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';

// PATCH /api/notifications/read-all
export async function PATCH() {
  try {
    const db = await readDB();
    db.notifications = db.notifications.map((n) => ({ ...n, read: true }));
    await writeDB(db);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
