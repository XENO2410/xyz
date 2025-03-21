// utils/translator.ts
import { stateLanguages } from '../config/languages';

interface TranslationCache {
  [key: string]: {
    [key: string]: string;
  };
}

const translationCache: TranslationCache = {};

export async function translateText(
  text: string, 
  targetLanguage: string, 
  state: string
) {
  // Check cache first
  if (translationCache[text]?.[targetLanguage]) {
    return translationCache[text][targetLanguage];
  }

  try {
    // Use CodeGPT for translation
    const response = await fetch('https://api.codegpt.co/api/v1/chat/completions', {
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
            content: `You are a professional translator. Translate the following text to ${targetLanguage}. Ensure the translation is natural and culturally appropriate for ${state}.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        stream: false,
        format: 'json'
      })
    });

    const data = await response.json();
    const translation = data.choices[0].message.content;

    // Cache the translation
    if (!translationCache[text]) {
      translationCache[text] = {};
    }
    translationCache[text][targetLanguage] = translation;

    return translation;

  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text
  }
}