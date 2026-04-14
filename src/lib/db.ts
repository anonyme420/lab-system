import fs from 'fs/promises';
import path from 'path';
import { Sample, Notification } from './types';

const DB_FILE = path.join(process.cwd(), 'data.json');

export interface DatabaseSchema {
  samples: Sample[];
  notifications: Notification[];
}

const SEED_DATA: DatabaseSchema = {
  samples: [
    {
      id: '1',
      sampleId: 'BIO-2025-0001',
      patientName: 'Ahmed Ben Salah',
      sampleType: 'Blood',
      collectionDate: '2025-04-01',
      receivedDate: '2025-04-02',
      testRequested: 'Complete Blood Count',
      status: 'pending',
      importSource: 'csv',
      importedAt: '2025-04-07T08:30:00Z',
      standardized: true,
    },
    {
      id: '2',
      sampleId: 'BIO-2025-0002',
      patientName: 'Fatma Trabelsi',
      sampleType: 'Urine',
      collectionDate: '2025-04-02',
      receivedDate: '2025-04-03',
      testRequested: 'Urinalysis',
      status: 'pending',
      importSource: 'excel',
      importedAt: '2025-04-07T09:15:00Z',
      standardized: true,
    },
    {
      id: '3',
      sampleId: 'BIO-2025-0003',
      patientName: 'Mohamed Khelifi',
      sampleType: 'Tissue',
      collectionDate: '2025-04-01',
      receivedDate: '2025-04-01',
      testRequested: 'Histopathology',
      status: 'approved',
      importSource: 'ocr',
      importedAt: '2025-04-07T10:00:00Z',
      validatedAt: '2025-04-07T14:00:00Z',
      validatedBy: 'Lab Manager',
      standardized: true,
    },
    {
      id: '4',
      sampleId: 'BIO-2025-0004',
      patientName: 'Amira Jaziri',
      sampleType: 'Blood',
      collectionDate: '2025-04-03',
      receivedDate: '2025-04-04',
      testRequested: 'Lipid Panel',
      status: 'rejected',
      importSource: 'csv',
      importedAt: '2025-04-07T11:30:00Z',
      validatedAt: '2025-04-07T15:00:00Z',
      validatedBy: 'Lab Manager',
      rejectionComment: 'Collection date inconsistency \u2014 please re-submit with correct date.',
      standardized: true,
    },
  ],
  notifications: [
    {
      id: 'n3',
      type: 'validation',
      title: 'Sample Approved',
      message: 'Sample BIO-2025-0003 has been approved by Lab Manager.',
      read: true,
      createdAt: '2025-04-07T14:00:00Z',
      sampleId: '3',
    },
    {
      id: 'n4',
      type: 'validation',
      title: 'Sample Rejected',
      message: 'Sample BIO-2025-0004 was rejected. Reason: Collection date inconsistency.',
      read: true,
      createdAt: '2025-04-07T15:00:00Z',
      sampleId: '4',
    },
  ]
};

let dbCache: DatabaseSchema | null = null;

export async function readDB(): Promise<DatabaseSchema> {
  if (dbCache) return dbCache;
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    dbCache = JSON.parse(data);
    return dbCache!;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await writeDB(SEED_DATA);
      return SEED_DATA;
    }
    throw err;
  }
}

export async function writeDB(data: DatabaseSchema): Promise<void> {
  dbCache = data;
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
