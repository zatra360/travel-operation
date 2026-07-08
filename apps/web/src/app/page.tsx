'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(user.isPlatformSuperAdmin ? '/platform' : '/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, user, router]);

  return null;
}
