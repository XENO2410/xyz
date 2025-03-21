// digital-seva\app\utils\schemeMatching.ts
import { CodeGPTClient } from './codegpt';
import { UserProfile, SchemeRecommendation } from '../types';

const codegptClient = new CodeGPTClient();

export async function getSchemeRecommendations(userProfile: UserProfile) {
  try {
    const prompt = generatePrompt(userProfile);
    const aiResponse = await codegptClient.getCompletion(prompt);
    return formatRecommendations(aiResponse, userProfile);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return fallbackRecommendations(userProfile);
  }
}

function generatePrompt(profile: UserProfile): string {
    return `
      As Digital Seva, analyze this Indian citizen's profile and provide detailed scheme recommendations:
  
      # User Profile
      ${profile.name ? `- Name: ${profile.name}` : ''}
      ${profile.age ? `- Age: ${profile.age} years` : ''}
      ${profile.sex ? `- Gender: ${profile.sex}` : ''}
      ${profile.maritalStatus ? `- Marital Status: ${profile.maritalStatus}` : ''}
      ${profile.location ? `- State: ${profile.location}` : ''}
      ${profile.category ? `- Category: ${profile.category}` : ''}
      ${profile.annualIncome ? `- Annual Income: ₹${profile.annualIncome.toLocaleString('en-IN')}` : ''}
      ${profile.residenceType ? `- Residence Type: ${profile.residenceType}` : ''}
      ${profile.familySize ? `- Family Size: ${profile.familySize} members` : ''}
      ${profile.isDifferentlyAbled ? `- Differently Abled: Yes (${profile.disabilityPercentage}%)` : ''}
      ${profile.isMinority ? '- Minority: Yes' : ''}
      ${profile.isStudent ? '- Education Status: Student' : ''}
      ${profile.employmentStatus ? `- Employment: ${profile.employmentStatus}` : ''}
      ${profile.isGovernmentEmployee ? '- Government Employee: Yes' : ''}
  
      Available Documents:
      ${profile.documents ? profile.documents.join(', ') : 'No documents specified'}
  
      Provide scheme recommendations in the following format:
  
      # Central Government Schemes
      [List eligible central schemes]
  
      # ${profile.location || 'State'} Government Schemes
      [List eligible state schemes]
  
      # Special Category Schemes
      [List category-specific schemes]
  
      For each scheme, include:
      - Scheme Name
      - Eligibility Criteria
      - Benefits Provided
      - Required Documents
      - Application Process
      - Official Website/Link
  
      Use markdown formatting:
      - Use ## for scheme names
      - Use ### for sections within schemes
      - Use bullet points (•) for lists
      - Use > for important notes
      `;
  }
  
  function formatRecommendations(aiResponse: string, profile: UserProfile): string {
    let formattedResponse = `# Personalized Scheme Recommendations\n\n`;
    
    // Add profile summary
    formattedResponse += `## Profile Summary\n`;
    formattedResponse += `• Name: ${profile.name || 'Not specified'}\n`;
    formattedResponse += `• State: ${profile.location || 'Not specified'}\n`;
    formattedResponse += `• Category: ${profile.category || 'Not specified'}\n\n`;
  
    // Add AI response
    formattedResponse += aiResponse;
  
    // Add footer notes
    formattedResponse += `\n\n> **Important Notes:**\n`;
    formattedResponse += `> • Please verify eligibility criteria at respective government portals\n`;
    formattedResponse += `> • Keep required documents ready before applying\n`;
    formattedResponse += `> • Contact local authorities for application assistance\n`;
  
    return formattedResponse;
  }
  
  function fallbackRecommendations(profile: UserProfile): string {
    let recommendations = `# General Scheme Recommendations\n\n`;
  
    if (profile.isStudent) {
      recommendations += `## Education Schemes\n\n`;
      recommendations += `### National Scholarship Portal\n`;
      recommendations += `• **Eligibility:** Students with family income below ₹8 lakh/year\n`;
      recommendations += `• **Benefits:** Financial assistance for education\n`;
      recommendations += `• **Documents Required:** Income certificate, academic records\n\n`;
    }
  
    if (profile.annualIncome && profile.annualIncome < 300000) {
      recommendations += `## Income Support Schemes\n\n`;
      recommendations += `### PM-KISAN\n`;
      recommendations += `• **Benefits:** ₹6,000 per year in three installments\n`;
      recommendations += `• **Documents Required:** Land records, Aadhaar card\n\n`;
    }
  
    if (profile.isDifferentlyAbled) {
      recommendations += `## Disability Support Schemes\n\n`;
      recommendations += `### ADIP Scheme\n`;
      recommendations += `• **Benefits:** Assistive devices and support\n`;
      recommendations += `• **Documents Required:** Disability certificate\n\n`;
    }
  
    recommendations += `\n> Please visit your nearest Common Service Centre (CSC) for application assistance.`;
  
    return recommendations;
  }