// digital-seva\app\hooks\useProfileCompletion.ts
import { useState, useEffect } from 'react';

export const useProfileCompletion = (user: any) => {
  const [completionData, setCompletionData] = useState({
    percentage: 0,
    missingFields: [] as string[],
  });

  const calculateCompletion = (user: any) => {
    const fields = {
      basic: {
        name: { weight: 10, label: 'Full Name' },
        email: { weight: 10, label: 'Email' },
        phone: { weight: 10, label: 'Phone Number' },
        age: { weight: 10, label: 'Age' },
        sex: { weight: 10, label: 'Gender' },
      },
      additional: {
        maritalStatus: { weight: 5, label: 'Marital Status' },
        address: { weight: 10, label: 'Address' },
        income: { weight: 15, label: 'Annual Income' },
        familySize: { weight: 10, label: 'Family Size' },
        occupation: { weight: 10, label: 'Occupation' },
      },
      documents: {
        aadhar: { weight: 25, label: 'Aadhar Card' },
        pan: { weight: 15, label: 'PAN Card' },
        other: { weight: 10, label: 'Additional Documents' },
      },
    };

    let completedPercentage = 0;
    const missing: string[] = [];

    // Calculate completion percentage and track missing fields
    Object.entries(fields).forEach(([section, sectionFields]) => {
      Object.entries(sectionFields).forEach(([field, { weight, label }]) => {
        if (user && user[field]) {
          completedPercentage += weight;
        } else {
          missing.push(label);
        }
      });
    });

    return {
      percentage: Math.round(completedPercentage),
      missingFields: missing,
    };
  };

  useEffect(() => {
    if (user) {
      const completion = calculateCompletion(user);
      setCompletionData(completion);
    }
  }, [user]);

  return completionData;
};