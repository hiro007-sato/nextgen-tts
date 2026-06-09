import { NextResponse } from 'next/server';
import textToSpeech from '@google-cloud/text-to-speech';

export async function POST(request: Request) {
  try {
    const { text, engine, voiceActor, googleVoice, googleKey } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'စာသားထည့်ရန်လိုအပ်ပါသည်' }, { status: 400 });
    }

    // --- GEMINI ENGINE LOGIC (မြန်မာအသံ - Charon / Zephyr) ---
    if (engine === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || ""; 
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [{ parts: [{ text: text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceActor || "Charon" }
            }
          }
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Gemini processing failed');
      }

      const data = await response.json();
      const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) throw new Error('API မှ အသံဒေတာ ပြန်မလာပါ');
      return NextResponse.json({ audioData: base64Audio, format: 'pcm' });
    }

    // --- GOOGLE TTS ENGINE LOGIC ---
    const activeKey = googleKey || process.env.GOOGLE_API_KEY;
    if (!activeKey) {
      return NextResponse.json({ error: 'Google API Key မရှိသေးပါ' }, { status: 400 });
    }

    const client = new textToSpeech.TextToSpeechClient({ apiKey: activeKey });
    const voiceName = googleVoice || 'my-MM-Studio-O';

    const [googleResponse] = await client.synthesizeSpeech({
      input: { text: text },
      voice: { languageCode: 'my-MM', name: voiceName },
      audioConfig: { audioEncoding: 'MP3' },
    });

    const mp3Base64 = googleResponse.audioContent as string;
    return NextResponse.json({ audioData: mp3Base64, format: 'mp3' });

  } catch (error: any) {
    console.error('TTS API Failure:', error);
    return NextResponse.json({ error: error.message || 'Server အမှားအယွင်းဖြစ်သွားပါသည်' }, { status: 500 });
  }
}
