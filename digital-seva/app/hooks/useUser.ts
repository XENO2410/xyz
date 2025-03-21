// app/hooks/useUser.ts
import { useState, useEffect } from 'react';
import { UserProfile } from '../types';

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch('/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await response.json();
        setUser(data);
        localStorage.setItem("userProfile", JSON.stringify(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        // Try to get from localStorage as fallback
        const savedProfile = localStorage.getItem("userProfile");
        if (savedProfile) {
          setUser(JSON.parse(savedProfile));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading, error };
}