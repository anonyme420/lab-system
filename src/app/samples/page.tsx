'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  FlaskConical,
  Search,
  X,
} from 'lucide-react';
import { Sample } from '@/lib/types';

export default function SamplesPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ id: string; action: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSamples = async () => {
    try {
      const res = await fetch('/api/samples');
      if (res.ok) {
        const data = await res.json();
        setSamples(data);
      }
    } catch (error) {
      console.error('Failed to fetch samples:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/samples/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (res.ok) {
        fetchSamples();
        setActionFeedback({ id, action: 'approved' });
        setTimeout(() => setActionFeedback(null), 2000);
      }
    } catch (error) {
      console.error('Failed to approve sample', error);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      const res = await fetch(`/api/samples/${rejectModal}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'rejected',
          comment: rejectComment || 'No comment provided.' 
        }),
      });
      if (res.ok) {
        setRejectModal(null);
        setRejectComment('');
        fetchSamples();
        setActionFeedback({ id: rejectModal, action: 'rejected' });
        setTimeout(() => setActionFeedback(null), 2000);
      }
    } catch (error) {
      console.error('Failed to reject sample', error);
    }
  };

  const filtered = samples.filter((s) => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const matchesSearch =
      !search ||
      s.sampleId.toLowerCase().includes(search.toLowerCase()) ||
      s.patientName.toLowerCase().includes(search.toLowerCase()) ||
      s.testRequested.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: samples.length,
    pending: samples.filter((s) => s.status === 'pending').length,
    approved: samples.filter((s) => s.status === 'approved').length,
    rejected: samples.filter((s) => s.status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading samples...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Sample Management</h1>
        <p>Review, approve, or reject lab samples </p>
      </div>

      {/* Filters & Search */}
      <div className="filter-bar">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}

        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            className="form-input"
            placeholder="Search samples..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px', width: '240px' }}
          />
        </div>
      </div>

      {/* Action Feedback */}
      {actionFeedback && (
        <div className={`validation-item ${actionFeedback.action === 'approved' ? 'success' : 'error'}`}
          style={{ marginBottom: '16px', animation: 'slideUp 0.3s ease' }}>
          <span className="validation-icon">
            {actionFeedback.action === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          </span>
          <span>Sample has been <strong>{actionFeedback.action}</strong> successfully.</span>
        </div>
      )}

      {/* Samples Table */}
      {filtered.length > 0 ? (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sample ID</th>
                <th>Patient</th>
                <th>Type</th>
                <th>Collection Date</th>
                <th>Test Requested</th>
                <th>Source</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sample) => (
                <tr key={sample.id} className="animate-fade-in">
                  <td><strong style={{ color: 'var(--text-primary)' }}>{sample.sampleId}</strong></td>
                  <td>{sample.patientName}</td>
                  <td>{sample.sampleType}</td>
                  <td>{sample.collectionDate}</td>
                  <td>{sample.testRequested}</td>
                  <td>
                    <span className={`source-tag ${sample.importSource}`}>
                      {sample.importSource}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${sample.status}`}>
                      <span className="status-dot" />
                      {sample.status}
                    </span>
                  </td>
                  <td>
                    {sample.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-approve btn-sm"
                          onClick={() => handleApprove(sample.id)}
                          title="Approve sample"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          className="btn btn-reject btn-sm"
                          onClick={() => setRejectModal(sample.id)}
                          title="Reject sample"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    ) : sample.status === 'rejected' && sample.rejectionComment ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MessageSquare size={12} /> {sample.rejectionComment.slice(0, 40)}…
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {sample.validatedAt ? `Validated ${new Date(sample.validatedAt).toLocaleDateString()}` : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <FlaskConical size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3>No samples found</h3>
          <p>
            {search ? 'Try adjusting your search query.' : 'Import data from the Upload or OCR pages.'}
          </p>
        </div>
      )}

      {/* Reject Modal (US-12 preview) */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={20} style={{ color: 'var(--status-rejected)' }} />
                Reject Sample
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setRejectModal(null)}>
                <X size={14} />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Provide a reason so the lab staff can correct the issue and resubmit.
            </p>
            <div className="form-group">
              <label>Rejection Comment</label>
              <textarea
                className="form-textarea"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="e.g., Collection date inconsistency — please re-submit with correct date."
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-reject" onClick={handleReject}>
                <XCircle size={14} /> Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
