'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Notification } from '@/lib/types';

const typeIcons: Record<string, typeof Upload> = {
  submission: Upload,
  validation: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Notifications</h1>
            <p>Stay updated on sample submissions and validation activity — US-05</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
              <CheckCheck size={14} /> Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'submission', label: 'Submissions' },
          { key: 'validation', label: 'Validations' },
        ].map((f) => (
          <button
            key={f.key}
            className={`filter-chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filtered.length > 0 ? (
        <div className="notification-list">
          {filtered.map((notif) => {
            const Icon = typeIcons[notif.type] || Info;
            const iconClass = notif.type === 'validation'
              ? (notif.title.includes('Rejected') ? 'error' : 'validation')
              : notif.type;

            return (
              <div
                key={notif.id}
                className={`notification-item ${!notif.read ? 'unread' : ''}`}
                onClick={() => handleMarkRead(notif.id)}
              >
                <div className={`notification-icon ${iconClass}`}>
                  {notif.title.includes('Rejected') ? <XCircle size={18} /> : <Icon size={18} />}
                </div>
                <div className="notification-body">
                  <h4>{notif.title}</h4>
                  <p>{notif.message}</p>
                </div>
                <span className="notification-time">{formatTime(notif.createdAt)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <Bell size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3>No notifications</h3>
          <p>
            {filter === 'unread'
              ? 'All caught up! No unread notifications.'
              : 'Notifications will appear here when samples are submitted or validated.'}
          </p>
        </div>
      )}
    </div>
  );
}
