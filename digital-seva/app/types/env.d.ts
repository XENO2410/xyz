// digital-seva\app\types\env.d.ts
declare global {
    namespace NodeJS {
      interface ProcessEnv {
        CODEGPT_API_KEY: string;
        CODEGPT_ORG_ID: string;
        NITHYA_AGENT_ID: string;
      }
    }
  }
  
  export {}