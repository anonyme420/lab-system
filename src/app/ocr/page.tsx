'use client';

import { useState, useRef } from 'react';
import { ScanLine, Upload, CheckCircle2, Edit3, AlertCircle, Save } from 'lucide-react';
import { standardizeSamples } from '@/lib/standardizer';
import { Sample } from '@/lib/types';

export default function OCRPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [fields, setFields] = useState<Record<string, string>>({
    patientName: '',
    sampleType: '',
    collectionDate: '',
    receivedDate: '',
    testRequested: '',
    sampleId: '',
  });
  const [extracted, setExtracted] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process with Tesseract.js (US-02)
    setProcessing(true);
    setProgress(0);
    setExtracted(false);
    setSaved(false);

    try {
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      const conf = result.data.confidence;

      setOcrText(text);
      setConfidence(conf);

      // Try to extract fields from OCR text
      const extractedFields = extractFields(text);
      setFields(extractedFields);
      setExtracted(true);
    } catch (err) {
      console.error('OCR Error:', err);
      setOcrText('OCR processing failed. Please try with a clearer image.');
      setConfidence(0);
    }

    setProcessing(false);
  };

  // Extract structured fields from OCR text
  function extractFields(text: string): Record<string, string> {
    const result: Record<string, string> = {
      patientName: '',
      sampleType: '',
      collectionDate: '',
      receivedDate: '',
      testRequested: '',
      sampleId: '',
    };

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    const extractValue = (keywords: string[]) => {
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (keywords.some(k => lower.includes(k))) {
          if (line.match(/[:=]/)) {
            const val = line.substring(line.search(/[:=]/) + 1).trim();
            if (val) return val;
          } else {
            const matchedKeyword = keywords.find(k => lower.includes(k));
            if (matchedKeyword) {
              const val = line.substring(lower.indexOf(matchedKeyword) + matchedKeyword.length).trim();
              if (val) return val;
            }
          }
        }
      }
      return '';
    };

    result.patientName = extractValue(['patient', 'name', 'nom']) || '';
    result.sampleType = extractValue(['type', 'sample type', 'specimen']) || '';
    result.collectionDate = extractValue(['collection', 'collected', 'prélèvement']) || '';
    result.receivedDate = extractValue(['received', 'reception', 'reçu']) || '';
    result.testRequested = extractValue(['test', 'analyse', 'examination']) || '';
    result.sampleId = extractValue(['sample id', 'id', 'numéro']) || '';

    // Clean up sample type to match exact select options
    const validTypes = ['Blood', 'Urine', 'Tissue', 'Serum', 'Plasma', 'Saliva', 'Stool', 'Swab'];
    for (const type of validTypes) {
      if (result.sampleType.toLowerCase().includes(type.toLowerCase())) {
        result.sampleType = type;
        break;
      }
    }

    // Try to find dates in the text if they haven't been picked up by exact keyword matching
    const dateRegex = /\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}/g;
    const dates = text.match(dateRegex) || [];
    if (!result.collectionDate && dates[0]) result.collectionDate = dates[0];
    if (!result.receivedDate && dates[1]) result.receivedDate = dates[1];

    // Format dates to YYYY-MM-DD for the HTML5 date input type
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.match(/(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})/);
      if (parts) {
        const p1 = parts[1];
        const p2 = parts[2];
        const p3 = parts[3];
        let year, month, day;
        if (p1.length === 4) { year = p1; month = p2; day = p3; }
        else if (p3.length === 4) { 
           if (parseInt(p1) > 12) { day = p1; month = p2; year = p3; }
           else { month = p1; day = p2; year = p3; }
        } else return '';
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return '';
    };

    result.collectionDate = formatDate(result.collectionDate);
    result.receivedDate = formatDate(result.receivedDate);

    return result;
  }

  const handleFieldChange = (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const sample: Sample = {
      id: String(Date.now()),
      sampleId: fields.sampleId || `BIO-2025-${Math.floor(Math.random() * 9000) + 1000}`,
      patientName: fields.patientName || 'Unknown',
      sampleType: fields.sampleType || 'Unspecified',
      collectionDate: fields.collectionDate || new Date().toISOString().slice(0, 10),
      receivedDate: fields.receivedDate || new Date().toISOString().slice(0, 10),
      testRequested: fields.testRequested || 'General',
      status: 'pending',
      importSource: 'ocr',
      importedAt: new Date().toISOString(),
      standardized: false,
    };

    const standardized = standardizeSamples([sample]);

    try {
      await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(standardized),
      });

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `n-${Date.now()}`,
          type: 'submission',
          title: 'OCR Sample Imported',
          message: `Sample ${standardized[0].sampleId} was imported via OCR scan and is awaiting validation.`,
          read: false,
          createdAt: new Date().toISOString(),
          sampleId: standardized[0].id,
        }),
      });

      setSaved(true);
    } catch (error) {
      console.error('Failed to save OCR sample', error);
      alert('Failed to save sample. Check console.');
    }
  };

  const confidenceColor = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';

  const reset = () => {
    setImagePreview(null);
    setOcrText('');
    setConfidence(0);
    setFields({ patientName: '', sampleType: '', collectionDate: '', receivedDate: '', testRequested: '', sampleId: '' });
    setExtracted(false);
    setSaved(false);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>OCR Scanner</h1>
        <p>Scan manual lab forms and extract sample data with OCR — US-02</p>
      </div>

      {/* Upload Zone */}
      {!imagePreview && (
        <div
          className="upload-zone"
          onClick={() => fileRef.current?.click()}
        >
          <div className="upload-icon">
            <ScanLine size={28} />
          </div>
          <h3>Upload a form image to scan</h3>
          <p>Supports scanned forms, photos of handwritten or printed lab documents</p>
          <div className="formats">
            <span className="format-tag">PNG</span>
            <span className="format-tag">JPG</span>
            <span className="format-tag">JPEG</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Processing */}
      {processing && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ marginBottom: '16px' }}>Processing image with Tesseract OCR...</p>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-label">
              <span>Recognizing text…</span>
              <span>{progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {extracted && !processing && (
        <div className="animate-slide-up">
          {saved && (
            <div className="validation-item success" style={{ marginBottom: '16px' }}>
              <span className="validation-icon"><CheckCircle2 size={16} /></span>
              <span>
                <strong>Sample saved successfully!</strong> It has been added to the system and is awaiting validation.
              </span>
            </div>
          )}

          <div className="ocr-grid">
            {/* Image preview + raw text */}
            <div className="ocr-preview">
              <h3>
                <Upload size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Scanned Image
              </h3>
              {imagePreview && (
                <img src={imagePreview} alt="Scanned form" style={{ marginBottom: '16px' }} />
              )}
              <h3 style={{ marginTop: '16px' }}>
                <ScanLine size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Raw OCR Text
              </h3>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: 'var(--text-secondary)',
                marginTop: '8px',
                whiteSpace: 'pre-wrap',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {ocrText || 'No text detected'}
              </div>

              {/* Confidence */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>OCR Confidence</span>
                  <span>{confidence.toFixed(1)}%</span>
                </div>
                <div className="confidence-bar">
                  <div className={`confidence-fill confidence-${confidenceColor}`} style={{ width: `${confidence}%` }} />
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="ocr-fields">
              <h3>
                <Edit3 size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Extracted Fields
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
                  (edit to correct)
                </span>
              </h3>

              {confidence < 50 && (
                <div className="validation-item warning" style={{ marginBottom: '16px', marginTop: '12px' }}>
                  <span className="validation-icon"><AlertCircle size={14} /></span>
                  <span style={{ fontSize: '12px' }}>Low confidence — please review and correct fields manually.</span>
                </div>
              )}

              <div className="form-group">
                <label>Sample ID</label>
                <input className="form-input" value={fields.sampleId} onChange={(e) => handleFieldChange('sampleId', e.target.value)} placeholder="Auto-generated if empty" />
              </div>
              <div className="form-group">
                <label>Patient Name *</label>
                <input className="form-input" value={fields.patientName} onChange={(e) => handleFieldChange('patientName', e.target.value)} placeholder="Patient full name" />
              </div>
              <div className="form-group">
                <label>Sample Type</label>
                <select className="form-select" value={fields.sampleType} onChange={(e) => handleFieldChange('sampleType', e.target.value)}>
                  <option value="">Select type</option>
                  <option value="Blood">Blood</option>
                  <option value="Urine">Urine</option>
                  <option value="Tissue">Tissue</option>
                  <option value="Serum">Serum</option>
                  <option value="Plasma">Plasma</option>
                  <option value="Saliva">Saliva</option>
                  <option value="Stool">Stool</option>
                  <option value="Swab">Swab</option>
                </select>
              </div>
              <div className="form-group">
                <label>Collection Date</label>
                <input className="form-input" type="date" value={fields.collectionDate} onChange={(e) => handleFieldChange('collectionDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Received Date</label>
                <input className="form-input" type="date" value={fields.receivedDate} onChange={(e) => handleFieldChange('receivedDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Test Requested</label>
                <input className="form-input" value={fields.testRequested} onChange={(e) => handleFieldChange('testRequested', e.target.value)} placeholder="e.g., Complete Blood Count" />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn btn-ghost" onClick={reset} style={{ flex: 1 }}>
                  Scan Another
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saved} style={{ flex: 1 }}>
                  <Save size={16} />
                  {saved ? 'Saved!' : 'Save Sample'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
