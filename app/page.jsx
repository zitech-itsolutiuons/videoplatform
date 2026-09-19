'use client';

// app/page.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.push('/videos');
  }, [router]);
  return null;
}
