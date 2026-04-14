// ============================================================
// Data standardization rules — US-04
// ============================================================
import { Sample } from './types';

// Standardize date formats to YYYY-MM-DD
function standardizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);

  // Try common patterns
  const patterns = [
    // DD/MM/YYYY
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/,
    // YYYY-MM-DD (already standard)
    /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/,
    // MM-DD-YYYY
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/,
  ];

  // Try ISO parse first
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  // DD/MM/YYYY pattern
  const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateStr;
}

// Standardize sample type names
const SAMPLE_TYPE_MAP: Record<string, string> = {
  blood: 'Blood',
  'whole blood': 'Blood',
  sang: 'Blood',
  urine: 'Urine',
  urines: 'Urine',
  tissue: 'Tissue',
  tissu: 'Tissue',
  serum: 'Serum',
  sérum: 'Serum',
  plasma: 'Plasma',
  saliva: 'Saliva',
  csf: 'Cerebrospinal Fluid',
  'spinal fluid': 'Cerebrospinal Fluid',
  stool: 'Stool',
  selles: 'Stool',
  swab: 'Swab',
};

function standardizeSampleType(type: string): string {
  if (!type) return 'Unspecified';
  const key = type.trim().toLowerCase();
  return SAMPLE_TYPE_MAP[key] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

// Standardize test names
const TEST_MAP: Record<string, string> = {
  cbc: 'Complete Blood Count',
  'complete blood count': 'Complete Blood Count',
  nfs: 'Complete Blood Count',
  fbc: 'Complete Blood Count',
  urinalysis: 'Urinalysis',
  'urine analysis': 'Urinalysis',
  ecbu: 'Urinalysis',
  glucose: 'Glucose Test',
  'blood sugar': 'Glucose Test',
  glycémie: 'Glucose Test',
  lipid: 'Lipid Panel',
  'lipid panel': 'Lipid Panel',
  bilan_lipidique: 'Lipid Panel',
  thyroid: 'Thyroid Panel',
  tsh: 'Thyroid Panel',
  histopathology: 'Histopathology',
  biopsy: 'Histopathology',
  biopsie: 'Histopathology',
};

function standardizeTestName(test: string): string {
  if (!test) return 'General';
  const key = test.trim().toLowerCase();
  return TEST_MAP[key] || test.charAt(0).toUpperCase() + test.slice(1);
}

// Standardize patient name
function standardizeName(name: string): string {
  if (!name) return 'Unknown';
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Standardize a single sample
export function standardizeSample(sample: Sample): Sample {
  return {
    ...sample,
    patientName: standardizeName(sample.patientName),
    sampleType: standardizeSampleType(sample.sampleType),
    collectionDate: standardizeDate(sample.collectionDate),
    receivedDate: standardizeDate(sample.receivedDate),
    testRequested: standardizeTestName(sample.testRequested),
    standardized: true,
  };
}

// Standardize an array of samples
export function standardizeSamples(samples: Sample[]): Sample[] {
  return samples.map(standardizeSample);
}
