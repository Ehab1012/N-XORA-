import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Play, Pause } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordComplete: (base64Audio: string) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onRecordComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          onRecordComplete(base64Audio);
        };
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      
      timerInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access is required to record voice notes.');
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-red-950/30 border border-red-500/30 rounded-xl px-4 py-2 w-full animate-in slide-in-from-bottom-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 text-red-400 animate-pulse">
        <Mic className="w-4 h-4" />
      </div>
      <div className="flex-1 text-sm font-mono text-red-200">
        Recording {formatTime(recordingTime)}
      </div>
      <button
        type="button"
        onClick={stopRecording}
        className="p-2 rounded-full bg-red-500 hover:bg-red-400 text-white transition-colors shadow-lg"
      >
        <Square className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          stopRecording();
          onCancel();
        }}
        className="p-2 rounded-full bg-[#1c1f38] hover:bg-[#25294a] text-slate-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
