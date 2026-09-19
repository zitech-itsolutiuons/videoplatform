'use client';

// components/AdminVideoToggle.jsx
// Every fetch is wrapped so a failed request unlocks the control and shows
// an error instead of leaving it stuck disabled.
import { useState } from 'react';

export default function AdminVideoToggle({ video, adminToken }) {
  const [isActive, setIsActive] = useState(video.is_active);
  const [busy, setBusy] = useState(false);
  const [revokeUserId, setRevokeUserId] = useState('');
  const [isPublic, setIsPublic] = useState(video.is_public || false);
  const [shareSecret, setShareSecret] = useState(video.public_share_secret || null);
  const [error, setError] = useState(null);

  async function callAdminApi(path, options = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${adminToken}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        // non-JSON response — treated as failure below
      }
      if (!res.ok) throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
      return data;
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    const data = await callAdminApi(`/videos/${video._id}/toggle`, { method: 'PATCH' });
    if (data) setIsActive(data.is_active);
  }

  async function togglePublic() {
    const data = await callAdminApi(`/videos/${video._id}/toggle-public`, { method: 'PATCH' });
    if (data) {
      setIsPublic(data.is_public);
      setShareSecret(data.share_secret);
    }
  }

  async function regenerateLink() {
    const data = await callAdminApi(`/videos/${video._id}/regenerate-share-link`, { method: 'POST' });
    if (data) setShareSecret(data.share_secret);
  }

  async function revokeUser() {
    if (!revokeUserId) return;
    const data = await callAdminApi(`/videos/${video._id}/revoke-user`, {
      method: 'PATCH',
      body: JSON.stringify({ userId: revokeUserId }),
    });
    if (data) setRevokeUserId('');
  }

  return (
    <div
      className="admin-video-row"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem 0', borderBottom: '1px solid #eee' }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <strong>{video.title}</strong>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={isActive} disabled={busy} onChange={toggleActive} />
          {isActive ? 'Active' : 'Deactivated'}
        </label>
        <input
          placeholder="User ID to revoke"
          value={revokeUserId}
          onChange={(e) => setRevokeUserId(e.target.value)}
          disabled={busy}
        />
        <button onClick={revokeUser} disabled={busy || !revokeUserId}>
          Revoke access
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={isPublic} disabled={busy} onChange={togglePublic} />
          {isPublic ? 'Public link enabled' : 'No public link (login required)'}
        </label>

        {isPublic && shareSecret && (
          <>
            <input
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/watch/${video._id}?share=${shareSecret}`}
              style={{ flex: 1, fontSize: '0.85rem', color: '#555' }}
              onFocus={(e) => e.target.select()}
            />
            <button onClick={regenerateLink} disabled={busy}>
              Regenerate link
            </button>
          </>
        )}
      </div>

      {error && <p style={{ color: 'crimson', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
    </div>
  );
}
