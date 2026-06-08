import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // 1. Check if OpenAI API Key is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const transcription = await openai.audio.transcriptions.create({
          file: file,
          model: 'whisper-1',
        });
        return NextResponse.json({ text: transcription.text });
      } catch (err: any) {
        console.error('[OpenAI Whisper Error]', err.message);
        return NextResponse.json({ error: `OpenAI Whisper failed: ${err.message}` }, { status: 500 });
      }
    }

    // 2. Check if AssemblyAI API Key is configured
    if (process.env.ASSEMBLYAI_API_KEY) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        // Upload audio file chunk to AssemblyAI
        const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: {
            authorization: process.env.ASSEMBLYAI_API_KEY,
            'content-type': 'application/octet-stream',
          },
          body: fileBuffer,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`AssemblyAI upload failed: ${uploadRes.statusText} - ${errText}`);
        }
        const uploadData = await uploadRes.json();
        const audioUrl = uploadData.upload_url;

        // Start transcription
        const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'POST',
          headers: {
            authorization: process.env.ASSEMBLYAI_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ 
            audio_url: audioUrl,
            speech_models: ['universal-3-pro', 'universal-2']
          }),
        });

        if (!transcriptRes.ok) {
          const errText = await transcriptRes.text();
          throw new Error(`AssemblyAI transcript start failed: ${transcriptRes.statusText} - ${errText}`);
        }
        const transcriptData = await transcriptRes.json();
        const id = transcriptData.id;

        // Poll for completion (max 35 retries, 150ms delay)
        let status = 'processing';
        let text = '';
        for (let i = 0; i < 35; i++) {
          await new Promise(r => setTimeout(r, 150));
          const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
            headers: {
              authorization: process.env.ASSEMBLYAI_API_KEY,
            },
          });
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            status = pollData.status;
            if (status === 'completed') {
              text = pollData.text;
              break;
            }
            if (status === 'failed') {
              throw new Error('AssemblyAI transcription processing failed');
            }
          }
        }
        return NextResponse.json({ text });
      } catch (err: any) {
        console.error('[AssemblyAI Error]', err.message);
        return NextResponse.json({ error: `AssemblyAI failed: ${err.message}` }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: 'Cloud transcription not configured. Please set OPENAI_API_KEY or ASSEMBLYAI_API_KEY in .env.local' },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('[Transcribe API General Error]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
