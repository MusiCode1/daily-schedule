/**
 * סקריפט ליצירת קובץ MP3 טסט מ-ElevenLabs
 * משמש לבדיקת AudioStreamer עם אודיו אמיתי
 */
import { ElevenLabsREST } from '../src/lib/server/elevenlabs-rest';
import { writeFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const text = `
שלום! זהו טסט של מערכת האודיו שלנו.
אני מדברת בקצב נורמלי, עם הפסקות טבעיות.
המטרה היא ליצור קובץ אודיו באורך של כ-20 שניות.
אנחנו רוצים לבדוק איך המערכת מטפלת בהזרמה של אודיו,
כולל חלוקה לחתיכות, השהיות רנדומליות,
וגדלים משתנים של כל חתיכה.
זה יעזור לנו לאבחן את הבעיה בצורה מדויקת יותר.
תודה רבה על ההקשבה!
`;

async function generateTestAudio() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel

  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('🎤 Generating test audio from ElevenLabs...');
  console.log('🎵 Format: PCM 24kHz (same as Google Gemini)');
  console.log(`📝 Text length: ${text.trim().length} characters`);
  console.log(`🗣️  Voice: Rachel (${voiceId})`);

  const elevenlabs = new ElevenLabsREST(apiKey, voiceId);
  const audioStream = await elevenlabs.streamAudio(text.trim());

  if (!audioStream) {
    console.error('❌ Failed to get audio stream');
    process.exit(1);
  }

  console.log('📦 Collecting audio chunks...');

  // איסוף כל ה-chunks
  const chunks: Uint8Array[] = [];
  const reader = audioStream.getReader();
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    chunkCount++;
    process.stdout.write(`\r   Received ${chunkCount} chunks...`);
  }

  console.log(`\n✅ Received ${chunkCount} chunks`);

  // שילוב לקובץ אחד
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const mp3Buffer = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    mp3Buffer.set(chunk, offset);
    offset += chunk.length;
  }

  // שמירה
  const outputPath = join(process.cwd(), 'static', 'test-audio.pcm');
  writeFileSync(outputPath, mp3Buffer);

  console.log('\n✅ Success!');
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`📊 Size: ${(mp3Buffer.length / 1024).toFixed(2)} KB`);
  console.log(`🎵 Format: PCM 24kHz mono`);
  console.log(`⏱️  Duration: ~${(mp3Buffer.length / 2 / 24000).toFixed(1)} seconds`);
  console.log('\n🧪 You can now test at: http://localhost:5173/audio-test');
}

generateTestAudio().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

class ElevenLabsREST {
  private apiKey: string;
  private voiceId: string;


  constructor(apiKey: string, voiceId: string) {
    this.apiKey = apiKey;
    this.voiceId = voiceId;
  }

  async streamAudio(text: string): Promise<ReadableStream<Uint8Array> | null> {
    if (!text || !text.trim()) return null;

    // Request PCM 16kHz - תואם ל-Gemini והאודיו שלנו
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream?output_format=pcm_16000`;
    const headers = {
      "Accept": "audio/pcm",
      "Content-Type": "application/json",
      "xi-api-key": this.apiKey
    };
    const data = {
      "text": text,
      "model_id": "eleven_turbo_v2_5", // מודל מהיר יותר, פחות סיכוי ל-timeout
      "voice_settings": {
        "stability": 0.5,
        "similarity_boost": 0.75
      }
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`ElevenLabs REST Error: ${response.status} ${errText}`);
        return null;
      }

      return response.body; // This is a ReadableStream<Uint8Array>
    } catch (e) {
      console.error("ElevenLabs REST Exception:", e);
      return null;
    }
  }
}
