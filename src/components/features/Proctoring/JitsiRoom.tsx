'use client';

import React from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

interface JitsiRoomProps {
  roomName: string;
  userName: string;
}

export default function JitsiRoom({ roomName, userName }: JitsiRoomProps) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: true,
          disableModeratorIndicator: true,
          startScreenSharing: false,
          enableEmailInStats: false,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        }}
        userInfo={{
          displayName: userName,
        }}
        onApiReady={(externalApi: any) => {
          // Here you can add custom listeners for proctoring signals
          externalApi.addEventListener('videoConferenceJoined', () => {
            console.log('AI Proctoring Active: Region ap-south-1');
          });
        }}
        getIFrameRef={(iframeRef: any) => {
          iframeRef.style.height = '100%';
          iframeRef.style.width = '100%';
        }}
      />
    </div>
  );
}
