'use client';

// components/LogoutButton.jsx
import { useRouter } from 'next/navigation';
import { clearSessionToken } from '../lib/session';

export default function LogoutButton() {
  const router = useRouter();
  function handleLogout() {
    clearSessionToken();
    router.push('/login');
  }
  return (
    <button onClick={handleLogout} style={{ background: '#6b7280' }}>
      Log out
    </button>
  );
}
