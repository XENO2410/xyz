// digital-seva\app\type.ts

export interface UserProfile {
    age: number;
    income: number;
    occupation: string;
    location: string;
    priorities: string[];
  }
  
  export interface Scheme {
    id: string;
    name: string;
    description: string;
    eligibilityCriteria: {
      minAge?: number;
      maxAge?: number;
      maxIncome?: number;
      occupations?: string[];
      locations?: string[];
    };
    category: string;
    benefits: string[];
  }
  