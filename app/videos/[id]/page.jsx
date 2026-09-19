'use client';

// app/videos/[id]/page.jsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '../../../components/VideoPlayer';
import { getSessionToken } from '../../../lib/session';

export default function WatchPage() {
  const { id } = useParams();
  const router = useRouter();
  const [title, setTitle] = useState(null);
  const [error, setError] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      router.push('/login');
      return;
    }
    setSessionToken(token);

    fetch(`/api/videos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load this video');
        setTitle(data.title);
      })
      .catch((err) => setError(err.message));
  }, [id, router]);

  if (error) return <p style={{ color: 'crimson', maxWidth: 640, margin: '2rem auto' }}>{error}</p>;
  if (!sessionToken || title === null) return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 960, margin: '2rem auto' }}>
      <h1>{title}</h1>
      <VideoPlayer videoId={id} sessionToken={sessionToken} />
    </div>
  );
}
