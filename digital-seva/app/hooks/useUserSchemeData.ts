// hooks/useUserSchemeData.ts
import { useState, useEffect } from 'react';
import { UserProfile } from '../types';

export function useUserSchemeData() {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }

    try {
      // Fetch user profile
      const profileResponse = await fetch('http://localhost:3000/api/auth/profile', {
        headers: {
          'x-auth-token': token,
        },
      });
      
      if (!profileResponse.ok) throw new Error('Failed to fetch profile');
      const profileData = await profileResponse.json();

      // Fetch documents
      const documentsResponse = await fetch('http://localhost:3000/api/documents/my-documents', {
        headers: {
          'x-auth-token': token,
        },
      });
      
      if (!documentsResponse.ok) throw new Error('Failed to fetch documents');
      const documentsData = await documentsResponse.json();

      // Prepare user data for AI assistant
      const userSchemeData: UserProfile = {
        name: profileData.name,
        age: profileData.age,
        sex: profileData.sex,
        maritalStatus: profileData.maritalStatus,
        annualIncome: profileData.annualIncome,
        location: profileData.location,
        category: profileData.category,
        residenceType: profileData.residenceType,
        isDifferentlyAbled: profileData.isDifferentlyAbled,
        disabilityPercentage: profileData.disabilityPercentage,
        isMinority: profileData.isMinority,
        isStudent: profileData.isStudent,
        employmentStatus: profileData.employmentStatus,
        isGovernmentEmployee: profileData.isGovernmentEmployee,
        documents: documentsData
          .filter((doc: any) => doc.isVerified)
          .map((doc: any) => doc.documentType)
      };

      setUserData(userSchemeData);
      setDocuments(userSchemeData.documents || []);
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  return { userData, documents, loading, error, refreshData: fetchUserData };
}