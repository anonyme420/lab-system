'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Upload,
  ScanLine,
  FlaskConical,
  Bell,
  Microscope,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Notification } from '@/lib/types';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload Files', icon: Upload },
  { href: '/ocr', label: 'OCR Scanner', icon: ScanLine },
  { href: '/samples', label: 'Samples', icon: FlaskConical },
  { href: '/notifications', label: 'Notifications', icon: Bell, showBadge: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const notifications: Notification[] = await res.json();
          setUnread(notifications.filter((n) => !n.read).length);
        }
      } catch (error) {
        // Silently fail on sidebar polling
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000); // Poll every 5s instead of 2s for API
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>
          <span className="logo-icon"><Microscope size={18} /></span>
          LabSync
        </h2>
        <span>Centralized Lab Sample System</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="link-icon"><Icon size={18} /></span>
              <span>{item.label}</span>
              {item.showBadge && unread > 0 && (
                <span className="sidebar-badge">{unread}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <p>Sprint 1 — Group 9</p>
        <p>v1.0.0 (API Mode)</p>
      </div>
    </aside>
  );
}
