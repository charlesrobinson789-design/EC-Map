// whisper.js — on-device speech-to-text via transformers.js
// Audio never leaves the device. Model weights are fetched once from HuggingFace CDN
// and cached by the browser; weights are generic, not PHI.

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Force the library to use the browser's WASM/WebGPU backend, never node.
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;
let loading = null;

export async function loadWhisper(onProgress) {
  if (transcriber) return transcriber;
  if (loading) return loading;
  loading = (async () => {
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en',
      {
        progress_callback: (info) => {
          if (onProgress) onProgress(info);
        },
      }
    );
    return transcriber;
  })();
  return loading;
}

// Records mic audio in a MediaRecorder, returns a Float32Array sampled to 16 kHz.
export class Recorder {
  constructor() {
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.startedAt = 0;
  }

  async start(onSilence) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
    this.recorder = new MediaRecorder(this.stream, { mimeType: pickMime() });
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
    this.startedAt = performance.now();

    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new Ctx();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let speechDetected = false;
      let silenceStart = Date.now();
      
      const checkSilence = () => {
        if (!this.recorder || this.recorder.state !== 'recording') return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        let avg = sum / bufferLength;

        if (avg > 12) { // speech threshold
          speechDetected = true;
          silenceStart = Date.now();
        } else {
          if (speechDetected && (Date.now() - silenceStart > 1200)) { // 1.2s silence after speech
            if (onSilence) onSilence(false);
            return;
          } else if (!speechDetected && (Date.now() - silenceStart > 8000)) { // 8s no speech
            if (onSilence) onSilence(true);
            return;
          }
        }
        requestAnimationFrame(checkSilence);
      };
      requestAnimationFrame(checkSilence);
    } catch (e) {
      console.warn("Silence detection not supported:", e);
    }
  }

  async stop() {
    if (!this.recorder) return null;
    if (this.recorder.state !== 'inactive') {
      const blob = await new Promise((resolve) => {
        this.recorder.onstop = () => resolve(new Blob(this.chunks, { type: this.recorder.mimeType || 'audio/webm' }));
        this.recorder.stop();
      });
      this.stream.getTracks().forEach((t) => t.stop());
      if (this.audioCtx) {
        this.audioCtx.close().catch(()=>{});
        this.audioCtx = null;
      }
      const duration = (performance.now() - this.startedAt) / 1000;
      this.recorder = null; this.stream = null; this.chunks = [];
      if (duration < 0.25) return null; // too short
      return blob;
    }
    return null;
  }
}

function pickMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  for (const m of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

// Decode a recorded Blob to a mono Float32Array @ 16 kHz for Whisper.
export async function blobToFloat32(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx({ sampleRate: 16000 });
  let audioBuf;
  try {
    audioBuf = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } catch (e) {
    ctx.close();
    throw e;
  }
  // Downmix to mono
  const ch0 = audioBuf.getChannelData(0);
  let mono;
  if (audioBuf.numberOfChannels === 1) {
    mono = new Float32Array(ch0);
  } else {
    const ch1 = audioBuf.getChannelData(1);
    mono = new Float32Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) mono[i] = (ch0[i] + ch1[i]) * 0.5;
  }
  // Resample if not 16k
  let out = mono;
  if (audioBuf.sampleRate !== 16000) {
    out = await resampleTo16k(mono, audioBuf.sampleRate);
  }
  ctx.close();
  return out;
}

async function resampleTo16k(samples, fromRate) {
  const offline = new OfflineAudioContext(1, Math.ceil(samples.length * 16000 / fromRate), 16000);
  const buf = offline.createBuffer(1, samples.length, fromRate);
  buf.copyToChannel(samples, 0);
  const src = offline.createBufferSource();
  src.buffer = buf;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

export async function transcribe(audioFloat32) {
  if (!transcriber) throw new Error('Whisper not loaded');
  const out = await transcriber(audioFloat32, {
    chunk_length_s: 30,
    stride_length_s: 5,
    language: 'english',
    task: 'transcribe',
  });
  return (out && out.text ? out.text : '').trim();
}

// Server-side (Gemini API) TTS — speaks the question aloud using a natural voice.
export async function speak(text, { rate = 1.0, pitch = 1.0 } = {}) {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!res.ok) {
      console.error("TTS failed:", await res.text());
      return;
    }
    const data = await res.json();
    if (data.audio) {
      await playAudioFromBase64(data.audio);
    }
  } catch (err) {
    console.error("TTS error:", err);
  }
}

let activeAudioContext = null;
let activeSource = null;

async function playAudioFromBase64(base64) {
  return new Promise(async (resolve) => {
    stopSpeaking();
    
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!activeAudioContext) {
        activeAudioContext = new Ctx({ sampleRate: 24000 });
      }
      if (activeAudioContext.state === 'suspended') {
        await activeAudioContext.resume();
      }

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      let audioBuf;
      try {
        // Try decoding as format with header (WAV/MP3/etc)
        audioBuf = await activeAudioContext.decodeAudioData(bytes.buffer.slice(0));
      } catch (decodeErr) {
        // Fallback: Assume raw 16-bit PCM at 24000Hz
        const dataView = new DataView(bytes.buffer);
        const numSamples = Math.floor(bytes.length / 2);
        audioBuf = activeAudioContext.createBuffer(1, numSamples, 24000);
        const channelData = audioBuf.getChannelData(0);
        for (let i = 0; i < numSamples; i++) {
          // Read 16-bit little-endian
          channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
        }
      }

      activeSource = activeAudioContext.createBufferSource();
      activeSource.buffer = audioBuf;
      activeSource.connect(activeAudioContext.destination);
      
      activeSource.onended = () => {
        activeSource = null;
        resolve();
      };
      
      activeSource.start(0);
    } catch (e) {
      console.error("Audio playback error:", e);
      resolve();
    }
  });
}

export function stopSpeaking() {
  if (activeSource) {
    activeSource.stop();
    activeSource.disconnect();
    activeSource = null;
  }
}
