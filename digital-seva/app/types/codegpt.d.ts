// types/codegpt.d.ts
export interface CodeGPTMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }
  
  export interface CodeGPTRequest {
    agentId: string;
    messages: CodeGPTMessage[];
    stream?: boolean;
    format?: 'json' | 'text';
  }
  
  export interface CodeGPTResponse {
    choices: {
      message: {
        content: string;
      };
    }[];
  }