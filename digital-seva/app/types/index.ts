// digital-seva\app\types\index.ts
export interface UserProfile {
  _id?: string;
  name?: string;
  age?: number;
  phoneNumber?: string;
  sex?: string;
  email?: string;
  maritalStatus?: string;
  address?: string;
  fatherName?: string;
  motherName?: string;
  annualIncome?: number;
  location?: string;
  familySize?: number;
  residenceType?: string;
  category?: string;
  isDifferentlyAbled?: boolean;
  disabilityPercentage?: number;
  isMinority?: boolean;
  isStudent?: boolean;
  employmentStatus?: string;
  isGovernmentEmployee?: boolean;
  documents?: string[];
}

export interface SchemeRecommendation {
  name: string;
  type: 'central' | 'state';
  description: string;
  eligibility: string;
  benefits: string;
  documents: string[];
  applicationProcess: string;
  url?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface StateLanguages {
  [key: string]: Language[];
  default: Language[];
}