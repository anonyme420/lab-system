// ============================================================
// Multi-format file parser (CSV, Excel, DOCX) — US-01
// ============================================================
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Sample, ImportSource } from './types';

let idCounter = Date.now();
function nextId(): string {
  return String(++idCounter);
}

function nextSampleId(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `BIO-2025-${num}`;
}

// Map common column name variations to our standard fields
const FIELD_MAP: Record<string, keyof Sample> = {
  patient: 'patientName',
  patient_name: 'patientName',
  patientname: 'patientName',
  name: 'patientName',
  'patient name': 'patientName',
  sample_type: 'sampleType',
  sampletype: 'sampleType',
  type: 'sampleType',
  'sample type': 'sampleType',
  collection_date: 'collectionDate',
  collectiondate: 'collectionDate',
  'collection date': 'collectionDate',
  collected: 'collectionDate',
  received_date: 'receivedDate',
  receiveddate: 'receivedDate',
  'received date': 'receivedDate',
  received: 'receivedDate',
  test: 'testRequested',
  test_requested: 'testRequested',
  testrequested: 'testRequested',
  'test requested': 'testRequested',
  sample_id: 'sampleId',
  sampleid: 'sampleId',
  'sample id': 'sampleId',
  id: 'sampleId',
};

function mapFields(row: Record<string, string>): Partial<Sample> {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '_');
    const field = FIELD_MAP[normalizedKey] || FIELD_MAP[normalizedKey.replace(/_/g, '')];
    if (field) {
      mapped[field] = String(value).trim();
    }
  }
  return mapped as unknown as Partial<Sample>;
}

function rowToSample(row: Record<string, string>, source: ImportSource): Sample {
  const mapped = mapFields(row);
  return {
    id: nextId(),
    sampleId: mapped.sampleId || nextSampleId(),
    patientName: mapped.patientName || 'Unknown',
    sampleType: mapped.sampleType || 'Unspecified',
    collectionDate: mapped.collectionDate || new Date().toISOString().slice(0, 10),
    receivedDate: mapped.receivedDate || new Date().toISOString().slice(0, 10),
    testRequested: mapped.testRequested || 'General',
    status: 'pending',
    importSource: source,
    importedAt: new Date().toISOString(),
    standardized: false,
    rawData: row,
  };
}

// ---- CSV ----
export function parseCSV(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });
  return result.data;
}

// ---- Excel ----
export function parseExcel(buffer: ArrayBuffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });
  return json;
}

// ---- Generic ----
export function rowsToSamples(rows: Record<string, string>[], source: ImportSource): Sample[] {
  return rows.map((row) => rowToSample(row, source));
}

export function detectFileType(fileName: string): ImportSource {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'csv': return 'csv';
    case 'xlsx':
    case 'xls': return 'excel';
    case 'docx':
    case 'doc': return 'docx';
    default: return 'manual';
  }
}
