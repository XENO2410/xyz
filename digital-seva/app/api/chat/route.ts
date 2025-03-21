// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { stateLanguages } from '@/app/config/languages';

const CODEGPT_API_URL = 'https://api.codegpt.co/api/v1/chat/completions';

interface ChatRequest {
  messages: { role: string; content: string }[];
  language: string;
  userData?: {
    name?: string;
    location?: string;
    age?: number;
    sex?: string;
    category?: string;
    annualIncome?: number;
    residenceType?: string;
    isDifferentlyAbled?: boolean;
    disabilityPercentage?: number;
    isMinority?: boolean;
    isStudent?: boolean;
    employmentStatus?: string;
    isGovernmentEmployee?: boolean;
    documents?: string[];
  };
}

interface SchemeMatch {
  schemeName: string;
  relevanceScore: number;
  reason: string;
}

function determineEligibleSchemes(userData: ChatRequest['userData']): SchemeMatch[] {
  const schemes: SchemeMatch[] = [];

  if (!userData) return schemes;

  // PM-KISAN
  if (userData.employmentStatus?.toLowerCase().includes('farmer')) {
    schemes.push({
      schemeName: 'PM-KISAN',
      relevanceScore: 1,
      reason: 'Based on farming occupation'
    });
  }

  // Ayushman Bharat
  if (userData.annualIncome && userData.annualIncome < 500000) {
    schemes.push({
      schemeName: 'Ayushman Bharat',
      relevanceScore: userData.annualIncome < 250000 ? 1 : 0.7,
      reason: 'Based on annual income criteria'
    });
  }

  // PM Awas Yojana
  if (userData.residenceType === 'Rural' && userData.annualIncome && userData.annualIncome < 300000) {
    schemes.push({
      schemeName: 'PM Awas Yojana (Rural)',
      relevanceScore: 1,
      reason: 'Based on rural residence and income criteria'
    });
  }

  // Education Schemes
  if (userData.isStudent) {
    schemes.push({
      schemeName: 'National Scholarship Portal Schemes',
      relevanceScore: 1,
      reason: 'Based on student status'
    });
  }

  // Disability Schemes
  if (userData.isDifferentlyAbled) {
    schemes.push({
      schemeName: 'ADIP Scheme',
      relevanceScore: userData.disabilityPercentage && userData.disabilityPercentage > 40 ? 1 : 0.8,
      reason: 'Based on disability status'
    });
  }

  return schemes.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, language, userData } = body;

    // Handle initial language selection
    if (messages.length === 1 && /^[1-3]$/.test(messages[0].content)) {
      const availableLanguages = stateLanguages[userData?.location || ''] || [];
      const selectedIndex = parseInt(messages[0].content) - 1;
      
      if (selectedIndex >= 0 && selectedIndex < availableLanguages.length) {
        return NextResponse.json({
          response: `Great! I'll continue in ${availableLanguages[selectedIndex].name}. How can I help you today?`
        });
      }
    }

    // Determine eligible schemes
    const eligibleSchemes = determineEligibleSchemes(userData);
    
    // Create enhanced user context
    const userContext = userData ? `
      User Profile Context:
      - Name: ${userData.name || 'Guest'}
      - Location: ${userData.location || 'Unknown'}
      - Age: ${userData.age || 'Not specified'}
      - Gender: ${userData.sex || 'Not specified'}
      - Category: ${userData.category || 'General'}
      - Annual Income: ₹${userData.annualIncome?.toLocaleString() || 'Not specified'}
      - Residence: ${userData.residenceType || 'Not specified'}
      - Employment: ${userData.employmentStatus || 'Not specified'}
      - Documents Available: ${userData.documents?.join(', ') || 'None'}
      
      Potentially Eligible Schemes:
      ${eligibleSchemes.map(scheme => 
        `- ${scheme.schemeName} (Relevance: ${Math.round(scheme.relevanceScore * 100)}%)`
      ).join('\n')}
      
      Instructions:
      1. Respond in ${language || 'English'} language
      2. Keep responses simple and clear
      3. Focus on schemes matching user's profile
      4. Provide specific application steps
      5. Include document requirements
      6. Use local context from ${userData.location || 'India'} when possible
    ` : 'Provide general information about government schemes in simple language.';

    const response = await fetch(CODEGPT_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CODEGPT_API_KEY}`,
        'CodeGPT-Org-Id': process.env.NEXT_PUBLIC_CODEGPT_ORG_ID!
      },
      body: JSON.stringify({
        agentId: process.env.NEXT_PUBLIC_NITHYA_AGENT_ID,
        messages: [
          { 
            role: 'system', 
            content: `You are Nithya, an AI assistant specializing in Indian government schemes. ${userContext}`
          },
          ...messages
        ],
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) {
      throw new Error(`CodeGPT API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      response: data.choices[0].message.content,
      eligibleSchemes: eligibleSchemes
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Error: ${error.message}`
      : "I apologize, but I'm having trouble connecting to my services. Please try again in a moment.";
    
    return NextResponse.json({ response: errorMessage }, { status: 200 });
  }
}