'use client';

// components/VideoPlayer.jsx
// -----------------------------------------------------------------------------
// Two auth modes, chosen by which prop is passed:
//   - Logged-in:   pass `sessionToken` -> POST /api/auth/stream-token
//   - Public link: pass `shareSecret`  -> POST /api/auth/public-stream-token
// Exactly one of the two should be provided.
//
// NOTE ON "PREVENT DOWNLOAD": nothing client-side makes video truly
// undownloadable. This removes the EASY paths (native save/PiP UI,
// right-click save, no direct/cacheable media URL) and gives fast,
// reliable revocation — it isn't DRM.
// -----------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function VideoPlayer({ videoId, sessionToken, shareSecret }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStreamToken() {
      const url = shareSecret
        ? `/api/auth/public-stream-token/${videoId}?share=${encodeURIComponent(shareSecret)}`
        : `/api/auth/stream-token/${videoId}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: shareSecret ? {} : { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not authorize playback');
      }
      return res.json();
    }

    async function setup() {
      try {
        const { streamToken, expiresIn } = await fetchStreamToken();
        if (cancelled) return;

        const playlistUrl = `/api/stream/${videoId}/index.m3u8?token=${streamToken}`;
        const video = videoRef.current;

        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(playlistUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) {
              setError('Playback stopped: access to this video has changed.');
              hls.destroy();
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = playlistUrl; // Safari native HLS
        }

        // Refresh 30s before expiry so long recordings don't stall; if the
        // caller has since been revoked, this call fails and we surface it.
        const refreshMs = Math.max((expiresIn - 30) * 1000, 10_000);
        refreshTimerRef.current = setInterval(async () => {
          try {
            await fetchStreamToken();
          } catch (err) {
            setError(err.message);
            clearInterval(refreshTimerRef.current);
            hlsRef.current?.destroy();
            video.pause();
          }
        }, refreshMs);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    setup();

    return () => {
      cancelled = true;
      clearInterval(refreshTimerRef.current);
      hlsRef.current?.destroy();
    };
  }, [videoId, sessionToken, shareSecret]);

  if (error) return <div className="video-player-error">{error}</div>;

  return (
    <video
      ref={videoRef}
      controls
      controlsList="nodownload noremoteplayback noplaybackrate"
      disablePictureInPicture
      disableRemotePlayback
      onContextMenu={(e) => e.preventDefault()}
      style={{ width: '100%', maxWidth: '960px', backgroundColor: '#000' }}
    />
  );
}
