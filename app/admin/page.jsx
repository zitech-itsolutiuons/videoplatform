'use client';

// app/admin/page.jsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminVideoToggle from '../../components/AdminVideoToggle';
import LogoutButton from '../../components/LogoutButton';
import { getSessionToken, getSessionUser } from '../../lib/session';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [videos, setVideos] = useState(null);
  const [error, setError] = useState(null);
  const token = getSessionToken();

  useEffect(() => {
    const user = getSessionUser();

    if (!token) {
      router.push('/login');
      return;
    }
    if (!user || user.role !== 'Admin') {
      setError('You need an Admin account to view this page.');
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
  }, [router, token]);

  if (error) return <p style={{ maxWidth: 640, margin: '2rem auto', color: 'crimson' }}>{error}</p>;
  if (!videos) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Admin dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/videos">← Back to videos</Link>
          <LogoutButton />
        </div>
      </div>
      {videos.length === 0 ? (
        <p>No videos uploaded yet.</p>
      ) : (
        videos.map((video) => <AdminVideoToggle key={video._id} video={video} adminToken={token} />)
      )}
    </div>
  );
}
