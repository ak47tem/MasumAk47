
import React, { useState, useEffect, useRef } from 'react';
import { PlayIcon, PauseIcon, DownloadIcon } from './Icons';
import { audioBufferToWav } from '../utils/audioUtils';
import { BeatEngine } from '../utils/beatEngine';

interface AudioPlayerProps {
  audioBuffer: AudioBuffer | undefined;
  title?: string;
  style?: string;
  tempo?: number;
  isLoading: boolean;
  onGenerate: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioBuffer, title, style, tempo, isLoading, onGenerate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const beatEngineRef = useRef<BeatEngine | null>(null);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const stopAll = () => {
    if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) {}
        sourceRef.current = null;
    }
    if (beatEngineRef.current) {
        beatEngineRef.current.stop();
    }
    setIsPlaying(false);
  };

  const handlePlayPause = async () => {
    if (!audioBuffer) return;

    if (isPlaying) {
      stopAll();
    } else {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioContextClass();
      } else if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
      }

      const ctx = audioContextRef.current;
      
      if (!beatEngineRef.current) {
          beatEngineRef.current = new BeatEngine(ctx);
      }

      // Apply dynamic parameters
      beatEngineRef.current.setTempo(tempo || 120);
      beatEngineRef.current.setGenre(style || 'Pop');

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => stopAll();
      
      sourceRef.current = source;
      beatEngineRef.current.start();
      source.start();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioBuffer) return;
    const blob = audioBufferToWav(audioBuffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'Track'}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-4">
        <button 
          onClick={audioBuffer ? handlePlayPause : undefined}
          disabled={!audioBuffer}
          className={`
            w-14 h-14 rounded-full flex items-center justify-center transition-all flex-shrink-0
            ${!audioBuffer && isLoading ? 'bg-zinc-800 cursor-wait' : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:scale-105 hover:from-pink-500 hover:to-purple-500 active:scale-95 shadow-lg shadow-pink-600/20'}
            ${!audioBuffer && !isLoading ? 'bg-zinc-800 opacity-50 cursor-not-allowed' : ''}
          `}
        >
           {!audioBuffer && isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
           ) : isPlaying ? (
               <PauseIcon className="w-6 h-6" />
           ) : (
               <PlayIcon className="w-6 h-6 ml-1" />
           )}
        </button>

        <div className="flex-1 h-12 bg-zinc-950 rounded-2xl flex items-center px-4 gap-1 overflow-hidden relative border border-zinc-800">
             <div className="flex items-center gap-0.5 w-full h-full opacity-60">
                {[...Array(40)].map((_, i) => (
                    <div 
                        key={i}
                        className={`w-1 rounded-full bg-pink-500 transition-all duration-300`}
                        style={{ 
                            height: isPlaying ? `${Math.max(15, Math.random() * 80)}%` : '15%',
                            opacity: isPlaying ? 1 : 0.2
                        }}
                    />
                ))}
             </div>
             {!audioBuffer && !isLoading && (
                 <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                     Studio Ready
                 </span>
             )}
             {audioBuffer && isLoading && (
                 <span className="absolute right-3 bottom-1 text-[8px] text-pink-500 font-black uppercase tracking-widest animate-pulse">
                     Streaming...
                 </span>
             )}
        </div>

        <button 
             onClick={handleDownload} 
             disabled={!audioBuffer || isLoading}
             className={`p-3 rounded-full transition-all ${!audioBuffer || isLoading ? 'bg-zinc-900 text-zinc-700' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 shadow-lg'}`}
             title="Download WAV"
        >
             <DownloadIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
