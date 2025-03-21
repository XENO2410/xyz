// digital-seva\app\utils\codegpt.ts
export class CodeGPTClient {
    async getCompletion(prompt: string) {
      try {
        const response = await fetch('/api/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt })
        });
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to get completion');
        }
  
        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No response received';
      } catch (error) {
        console.error('CodeGPT Client Error:', error);
        throw error;
      }
    }
  }