'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  Bell,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Sample, Notification } from '@/lib/types';

export default function DashboardPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resSamples, resNotifs] = await Promise.all([
          fetch('/api/samples'),
          fetch('/api/notifications')
        ]);
        if (resSamples.ok) {
          const data = await resSamples.json();
          setSamples(data);
        }
        if (resNotifs.ok) {
          const data = await resNotifs.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const pending = samples.filter((s) => s.status === 'pending').length;
  const approved = samples.filter((s) => s.status === 'approved').length;
  const rejected = samples.filter((s) => s.status === 'rejected').length;
  const unread = notifications.filter((n) => !n.read).length;

  const recentSamples = [...samples]
    .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your lab sample management system</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-color': '#6366f1' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
            <FlaskConical size={22} />
          </div>
          <div className="stat-value">{samples.length}</div>
          <div className="stat-label">Total Samples</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#f59e0b' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div className="stat-value">{pending}</div>
          <div className="stat-label">Pending Validation</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#10b981' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-value">{approved}</div>
          <div className="stat-label">Approved</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#ef4444' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <XCircle size={22} />
          </div>
          <div className="stat-value">{rejected}</div>
          <div className="stat-label">Rejected</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#22d3ee' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'rgba(34, 211, 238, 0.15)', color: '#22d3ee' }}>
            <Bell size={22} />
          </div>
          <div className="stat-value">{unread}</div>
          <div className="stat-label">Unread Notifications</div>
        </div>
      </div>

      {/* Quick Actions + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Quick Actions */}
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} /> Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/upload" style={{ textDecoration: 'none' }}>
              <div className="btn btn-primary" style={{ width: '100%', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={16} /> Upload Files
                </span>
                <ArrowRight size={16} />
              </div>
            </Link>
            <Link href="/ocr" style={{ textDecoration: 'none' }}>
              <div className="btn btn-ghost" style={{ width: '100%', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📷 OCR Scanner
                </span>
                <ArrowRight size={16} />
              </div>
            </Link>
            <Link href="/samples" style={{ textDecoration: 'none' }}>
              <div className="btn btn-ghost" style={{ width: '100%', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FlaskConical size={16} /> View All Samples
                </span>
                <ArrowRight size={16} />
              </div>
            </Link>
            {pending > 0 && (
              <Link href="/samples" style={{ textDecoration: 'none' }}>
                <div className="btn btn-approve" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} /> Validate Pending ({pending})
                  </span>
                  <ArrowRight size={16} />
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            Recent Activity
          </h3>
          <div className="activity-list">
            {recentSamples.map((sample) => (
              <div key={sample.id} className="activity-item">
                <div className={`activity-dot ${sample.status}`} />
                <div className="activity-text">
                  <strong>{sample.sampleId}</strong> — {sample.patientName}
                  <br />
                  <span style={{ fontSize: '12px' }}>
                    {sample.testRequested} • via {sample.importSource.toUpperCase()}
                  </span>
                </div>
                <span className={`status-badge ${sample.status}`}>
                  <span className="status-dot" />
                  {sample.status}
                </span>
              </div>
            ))}
            {recentSamples.length === 0 && (
              <div className="empty-state">
                <p>No samples yet. Start by uploading files.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
