// digital-seva\app\api\recommendations\route.ts
import { NextResponse } from 'next/server';

const CODEGPT_API_URL = 'https://api.codegpt.co/api/v1/chat/completions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const response = await fetch(CODEGPT_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CODEGPT_API_KEY}`,
        'CodeGPT-Org-Id': process.env.NEXT_PUBLIC_CODEGPT_ORG_ID!
      },
      body: JSON.stringify({
        agentId: process.env.NEXT_PUBLIC_CODEGPT_AGENT_ID,
        stream: false,
        format: "json",
        messages: [
          {
            role: "user",
            content: body.prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('CodeGPT API Error:', errorData);
      throw new Error(errorData.message || 'API request failed');
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}