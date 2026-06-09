'use client';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Play, Pause, Download, Volume2, Settings, History, 
  RefreshCw, Key, HelpCircle, Trash2
} from 'lucide-react';

const BURMESE_SAMPLES = [
  { label: "နှုတ်ခွန်းဆက်စကား", text: "မင်္ဂလာပါခင်ဗျာ။ NEXTGEN သဘာဝအတိုင်း အသံထွက်စနစ်မှ ကြိုဆိုပါတယ်။" },
  { label: "နည်းပညာ", text: "ယနေ့ခေတ်တွင် ဉာဏ်ရည်တုနည်းပညာများသည် ကျွန်ုပ်တို့၏ လူမှုဘဝကို အထောက်အကူပြုနေပြီ ဖြစ်သည်။" }
];

interface HistoryItem { id: string; text: string; engine: string; url: string; date: string; }

export default function Home() {
  const [text, setText] = useState('');
  const [engine, setEngine] = useState<'gemini' | 'google'>('gemini');
  const [googleKey, setGoogleKey] = useState('');
  const [voiceActor, setVoiceActor] = useState('Charon');
  const [googleVoice, setGoogleVoice] = useState('my-MM-Studio-O');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('nxt_google_key');
    if (savedKey) setGoogleKey(savedKey);
    const savedHist = localStorage.getItem('nxt_tts_history');
    if (savedHist) setHistory(JSON.parse(savedHist));
  }, []);

  const pcm16ToWavBlob = (pcmBytes: Uint8Array, sampleRate = 24000) => {
    const buffer = new ArrayBuffer(44 + pcmBytes.byteLength);
    const view = new DataView(buffer);
    const writeStr = (v: DataView, off: number, s: string) => {
      for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmBytes.byteLength, true);
    writeStr(view, 8, 'WAVE');
    writeStr(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(view, 36, 'data');
    view.setUint32(40, pcmBytes.byteLength, true);
    new Uint8Array(buffer, 44).set(pcmBytes);
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, engine, voiceActor, googleVoice, googleKey })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'အသံပြောင်းလဲမှုစနစ် ချို့ယွင်းချက်');

      const binaryString = window.atob(data.audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      const finalBlob = data.format === 'pcm' ? pcm16ToWavBlob(bytes, 24000) : new Blob([bytes], { type: 'audio/mp3' });
      const generatedUrl = URL.createObjectURL(finalBlob);

      setAudioUrl(generatedUrl);

      const updatedHistory = [{
        id: Date.now().toString(),
        text,
        engine: engine === 'gemini' ? `Gemini (${voiceActor})` : 'Google Cloud',
        url: generatedUrl,
        date: new Date().toLocaleTimeString()
      }, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('nxt_tts_history', JSON.stringify(updatedHistory));

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, audioUrl]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-900 bg-slate-900/40 p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Volume2 className="text-emerald-400" size={24} />
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">NEXTGEN TTS Workspace</h1>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 grid grid-cols-1 md:grid-cols-3 gap-6 my-4">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-3 flex gap-2">
            <button onClick={() => setEngine('gemini')} className={`flex-1 py-2 rounded-lg text-xs font-medium ${engine === 'gemini' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>Gemini Engine</button>
            <button onClick={() => setEngine('google')} className={`flex-1 py-2 rounded-lg text-xs font-medium ${engine === 'google' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>Google Cloud</button>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-4">
            {engine === 'gemini' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Voice Model</label>
                  <select value={voiceActor} onChange={(e) => setVoiceActor(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
                    <option value="Charon">Charon (Studio - ယောက်ျားလေး)</option>
                    <option value="Zephyr">Zephyr (Studio - မိန်းကလေး)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-slate-400 mb-2">Google Voice Model</label>
                <select value={googleVoice} onChange={(e) => setGoogleVoice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
                  <option value="my-MM-Studio-O">my-MM-Studio-O (Female)</option>
                  <option value="my-MM-Studio-N">my-MM-Studio-N (Male)</option>
                </select>
              </div>
            )}

            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="ဤနေရာတွင် မြန်မာစာသားများကို ရိုက်ထည့်ပါ..." rows={6} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200" />

            <div className="flex gap-2 text-[11px] text-slate-500">
              {BURMESE_SAMPLES.map((s, i) => (
                <button key={i} onClick={() => setText(s.text)} className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">{s.label}</button>
              ))}
            </div>

            <button onClick={handleGenerate} disabled={loading || !text.trim()} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold py-3 rounded-xl transition">
              {loading ? <RefreshCw className="animate-spin mx-auto" size={18} /> : "အသံပြောင်းပါ"}
            </button>
          </div>

          {audioUrl && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
              <audio ref={audioRef} src={audioUrl} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => setIsPlaying(false)} className="hidden" />
              <div className="flex items-center justify-between">
                <button onClick={togglePlay} className="p-3 bg-emerald-500 text-slate-950 rounded-lg">
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <select value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} className="bg-slate-950 text-xs border border-slate-800 rounded p-1">
                  <option value="1.0">1.0x (Normal)</option>
                  <option value="1.2">1.2x (Fast)</option>
                </select>
                <a href={audioUrl} download={`tts-${Date.now()}.wav`} className="p-2.5 bg-slate-800 rounded-lg text-slate-300"><Download size={16} /></a>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {showSettings && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <label className="text-[11px] text-slate-400 block font-semibold">GOOGLE API KEY</label>
              <input type="password" value={googleKey} onChange={(e) => { setGoogleKey(e.target.value); localStorage.setItem('nxt_google_key', e.target.value); }} placeholder="AIzaSy..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono" />
            </div>
          )}

          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-400 block">သမိုင်းမှတ်တမ်း (History)</span>
            {history.length === 0 ? <p className="text-xs text-slate-600 text-center py-4">မှတ်တမ်းမရှိသေးပါ</p> : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} onClick={() => { setAudioUrl(h.url); setText(h.text); }} className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-xs cursor-pointer hover:border-emerald-500">
                    <p className="text-slate-300 truncate font-medium">{h.text}</p>
                    <span className="text-[10px] text-slate-500 block mt-1">{h.engine} • {h.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
