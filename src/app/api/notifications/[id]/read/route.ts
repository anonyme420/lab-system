import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';

// PATCH /api/notifications/[id]/read
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const db = await readDB();
    const idx = db.notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      db.notifications[idx] = { ...db.notifications[idx], read: true };
      await writeDB(db);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
