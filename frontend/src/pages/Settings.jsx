import { ChevronRight, Info, Database, Bell, User, FileDown } from 'lucide-react';

export default function Settings() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your LoadVault account</p>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-label">Account</div>

        <div className="settings-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={16} />
            </div>
            <div className="settings-row-text">
              <div className="settings-row-label">Company Profile</div>
              <div className="settings-row-desc">Your business name, MC number, DOT number</div>
            </div>
          </div>
          <ChevronRight size={17} className="settings-row-action" />
        </div>

        <div className="settings-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fef9c3', color: '#a16207', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bell size={16} />
            </div>
            <div className="settings-row-text">
              <div className="settings-row-label">Notifications</div>
              <div className="settings-row-desc">Load alerts and delivery confirmations</div>
            </div>
          </div>
          <ChevronRight size={17} className="settings-row-action" />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-label">Data</div>

        <div className="settings-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Database size={16} />
            </div>
            <div className="settings-row-text">
              <div className="settings-row-label">Storage</div>
              <div className="settings-row-desc">In-memory — data resets on server restart</div>
            </div>
          </div>
          <span className="badge badge-warning">Dev Mode</span>
        </div>

        <div className="settings-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileDown size={16} />
            </div>
            <div className="settings-row-text">
              <div className="settings-row-label">Export Data</div>
              <div className="settings-row-desc">Download loads and companies as CSV</div>
            </div>
          </div>
          <ChevronRight size={17} className="settings-row-action" />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-label">About</div>

        <div className="settings-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Info size={16} />
            </div>
            <div className="settings-row-text">
              <div className="settings-row-label">LoadVault Dispatch</div>
              <div className="settings-row-desc">Version 1.0.0 · Build Iteration 1</div>
            </div>
          </div>
        </div>
      </div>

      <div className="version-tag">
        LoadVault Dispatch CRM · Build 1 · © 2025
      </div>
    </div>
  );
}
