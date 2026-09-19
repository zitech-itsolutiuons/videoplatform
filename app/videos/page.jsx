'use client';

// app/videos/page.jsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSessionToken, getSessionUser } from '../../lib/session';
import LogoutButton from '../../components/LogoutButton';

export default function VideoListPage() {
  const router = useRouter();
  const [videos, setVideos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/videos', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/login');
          return [];
        }
        if (!res.ok) throw new Error('Failed to load videos');
        return res.json();
      })
      .then(setVideos)
      .catch((err) => setError(err.message));
  }, [router]);

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!videos) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Available recordings</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {getSessionUser()?.role === 'Admin' && <Link href="/admin">Admin dashboard →</Link>}
          <LogoutButton />
        </div>
      </div>

      {videos.length === 0 ? (
        <p>No videos available to you yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {videos.map((v) => (
            <li key={v._id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #eee' }}>
              <Link href={`/videos/${v._id}`}>{v.title}</Link>
              {!v.is_active && <span style={{ color: '#999', marginLeft: '0.5rem' }}>(inactive)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
