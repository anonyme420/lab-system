import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';
import { Notification } from '@/lib/types';

// PATCH /api/samples/[id]/status
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { status, comment } = await request.json();
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { id } = await params;
    const db = await readDB();
    const idx = db.samples.findIndex((s) => s.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
    }

    // Update sample
    db.samples[idx] = {
      ...db.samples[idx],
      status,
      validatedAt: new Date().toISOString(),
      validatedBy: 'Lab Manager',
      rejectionComment: status === 'rejected' ? comment : undefined,
    };

    // Create notification
    const notif: Notification = {
      id: `n-${Date.now()}`,
      type: 'validation',
      title: status === 'approved' ? 'Sample Approved' : 'Sample Rejected',
      message: `Sample ${db.samples[idx].sampleId} has been ${status}${
        comment ? `. Reason: ${comment}` : ''
      }.`,
      read: false,
      createdAt: new Date().toISOString(),
      sampleId: id,
    };
    db.notifications = [notif, ...db.notifications];

    await writeDB(db);
    return NextResponse.json(db.samples[idx]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update sample status' }, { status: 500 });
  }
}
