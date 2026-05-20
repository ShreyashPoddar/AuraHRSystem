'use client';

import React, { useEffect, useRef, useState } from 'react';

interface JitsiRoomProps {
  roomName: string;
  candidateName: string;
  onEvent?: (event: string, data: any) => void;
}

export default function JitsiRoom({ roomName, candidateName, onEvent }: JitsiRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      // @ts-ignore
      const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: candidateName },
        configOverwrite: {
          startWithAudioMuted: true,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'chat', 'hangup'],
        },
      });

      const handleVisibilityChange = () => {
        if (document.hidden) {
          setIsWarning(true);
          onEvent?.('TAB_SWITCH', { timestamp: new Date() });
          setTimeout(() => setIsWarning(false), 5000);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        api.dispose();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    };
  }, [roomName, candidateName, onEvent]);

  return (
    <div className="relative w-full h-[600px] border-2 border-primary/20 rounded-xl overflow-hidden bg-black text-white">
      <div ref={containerRef} className="w-full h-full" />
      {isWarning && (
        <div className="absolute top-4 right-4 bg-red-600/90 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce z-50">
          ⚠️ Tab Switch Detected. Incident logged.
        </div>
      )}
    </div>
  );
}
