'use client';

// app/watch/[id]/page.jsx
// Public share link — NO login required. Visited as:
//   https://yourapp.vercel.app/watch/<videoId>?share=<public_share_secret>
import { useSearchParams, useParams } from 'next/navigation';
import VideoPlayer from '../../../components/VideoPlayer';

export default function PublicWatchPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const shareSecret = searchParams.get('share');

  if (!shareSecret) {
    return (
      <p style={{ maxWidth: 640, margin: '2rem auto', color: 'crimson' }}>
        This link is missing its share code and can&apos;t play the video.
      </p>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '2rem auto' }}>
      <VideoPlayer videoId={id} shareSecret={shareSecret} />
    </div>
  );
}
