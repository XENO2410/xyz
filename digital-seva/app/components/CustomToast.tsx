// digital-seva\app\components\CustomToast.tsx
import { useState, useEffect } from 'react';

interface CustomToastProps {
  message: string;
  duration?: number;
}

export default function CustomToast({ message, duration = 3000 }: CustomToastProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#333',
      color: '#fff',
      padding: '10px 20px',
      borderRadius: '5px',
      zIndex: 1000,
    }}>
      {message}
    </div>
  );
}
