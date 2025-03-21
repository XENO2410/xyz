// app/components/AIAssistant.tsx
import { useState } from 'react';
import { UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Bot } from 'lucide-react';
import { useUserSchemeData } from '../hooks/useUserSchemeData';
import { useTranslation } from "@/app/lib/TranslationContext";

interface AIAssistantProps {
  user: UserProfile;
}

export function AIAssistant({ user }: AIAssistantProps) {
  const { userData, documents, loading: dataLoading, error: dataError } = useUserSchemeData();
  const [recommendations, setRecommendations] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { t } = useTranslation();

  const generateSchemeRecommendations = async () => {
    if (!userData) return;

    setIsLoading(true);
    try {
      const prompt = `
        Based on the following user profile, recommend suitable government schemes:
        
        Name: ${userData.name}
        Age: ${userData.age}
        Gender: ${userData.sex}
        Annual Income: ₹${userData.annualIncome || 'Not specified'}
        Location: ${userData.location || 'Not specified'}
        Category: ${userData.category || 'General'}
        Residence: ${userData.residenceType || 'Not specified'}
        
        Special Categories:
        ${userData.isDifferentlyAbled ? `- Differently Abled (${userData.disabilityPercentage}%)` : ''}
        ${userData.isMinority ? '- Minority' : ''}
        ${userData.isStudent ? '- Student' : ''}
        ${userData.employmentStatus ? `- Employment: ${userData.employmentStatus}` : ''}
        
        Available Documents:
        ${documents.length > 0 ? documents.join(', ') : 'No verified documents'}
      `;

      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) throw new Error('Failed to get recommendations');
      
      const data = await response.json();
      setRecommendations(data.choices?.[0]?.message?.content || 'No recommendations available');

    } catch (err) {
      console.error('Error:', err);
      setError('Failed to get recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex justify-center items-center p-8">
            <Loader className="animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dataError) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="text-red-500 text-center">{dataError}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6" />
            <span>{t("aiAssistant")}</span>
          </div>
          <button
            onClick={generateSchemeRecommendations}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg ${
              isLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <Loader className="animate-spin mr-2" size={16} />
                {t("analyzing")}
              </div>
            ) : (
              t("getrecommendations")
            )}
          </button>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Profile Summary */}
        {userData && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-2">{t("profilesummary")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p>{t("Name")}: {userData.name || 'Not specified'}</p>
                <p>{t("age")}: {userData.age || 'Not specified'}</p>
                <p>{t("location")}: {userData.location || 'Not specified'}</p>
              </div>
              <div>
                <p>{t("category")}: {userData.category || 'General'}</p>
                <p>{t("income")}: ₹{userData.annualIncome?.toLocaleString() || 'Not specified'}</p>
                <p>{t("Employment")}: {userData.employmentStatus || 'Not specified'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Recommendations */}
        {recommendations && (
          <div className="mt-4 prose max-w-none">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: recommendations.replace(/\n/g, '<br />') 
              }} 
              className="p-4 bg-gray-50 rounded-lg"
            />
          </div>
        )}

        {/* Initial State */}
        {!recommendations && !error && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            {t("aiAssistantDesc")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}