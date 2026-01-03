
import React, { useState } from 'react';
import { SongRequest, GenerationState } from '../types.ts';
import { SparklesIcon, DiceIcon, MagicIcon, UndoIcon, MusicIcon, GridIcon } from './Icons.tsx';

interface ControlPanelProps {
  onSubmit: (request: SongRequest) => void;
  status: GenerationState;
  variant?: 'hero' | 'compact';
}

const GENRES = ['Pop', 'Lo-fi', 'Techno', 'Rock', 'Hip-Hop', 'Acoustic', 'Bengali Folk', 'Jazz'];
const MOODS = ['Chill', 'Energetic', 'Sad', 'Happy', 'Dark', 'Romantic'];

const CREATIVE_PROMPTS = [
  "A cyberpunk synthwave track about a neon city rain",
  "A heavy metal anthem for space vikings",
  "A soft acoustic ballad about drinking coffee in Paris",
  "An energetic K-Pop song about winning a video game"
];

export const ControlPanel: React.FC<ControlPanelProps> = ({ onSubmit, status, variant = 'hero' }) => {
  const [mode, setMode] = useState<'simple' | 'custom' | 'studio'>('simple');
  const [description, setDescription] = useState('');
  const [studioGenre, setStudioGenre] = useState('Pop');
  const [studioMood, setStudioMood] = useState('Happy');
  const [studioTempo, setStudioTempo] = useState(120);
  const [studioTopic, setStudioTopic] = useState('');
  const [customLyrics, setCustomLyrics] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [version, setVersion] = useState(3);
  const [autoEnhance, setAutoEnhance] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'custom') {
        if (!customLyrics.trim() && !customStyle.trim()) return;
        onSubmit({
            mode: 'custom',
            customLyrics,
            genre: customStyle || 'Auto-Detect',
            topic: customTitle || undefined,
            version,
            autoEnhance
        });
    } else if (mode === 'studio') {
        onSubmit({
            mode: 'studio',
            topic: studioTopic || "Studio Production",
            genre: studioGenre,
            mood: studioMood,
            tempo: studioTempo,
            version
        });
    } else {
        if (!description.trim()) return;
        onSubmit({
            mode: 'ai',
            topic: description,
            genre: 'Auto-Detect',
            mood: 'Auto-Detect',
            version
        });
        if (variant === 'compact') setDescription('');
    }
  };

  const handleSurpriseMe = () => {
    const random = CREATIVE_PROMPTS[Math.floor(Math.random() * CREATIVE_PROMPTS.length)];
    setDescription(random);
  };

  const isGenerating = status !== GenerationState.IDLE && status !== GenerationState.COMPLETED && status !== GenerationState.ERROR;

  const VersionSelector = () => (
    <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Model Version</label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${version >= 4 ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                {version === 1 && "V1: Basic"}
                {version === 2 && "V2: Standard"}
                {version === 3 && "V3: Professional"}
                {version === 4 && "V4: Advanced"}
                {version === 5 && "V5: Ultra HD"}
            </span>
        </div>
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {[1, 2, 3, 4, 5].map((v) => (
                <button
                    key={v}
                    type="button"
                    onClick={() => setVersion(v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${version === v ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    V{v}
                </button>
            ))}
        </div>
    </div>
  );

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-xl flex items-center gap-3">
        <div className="relative flex-1 group">
           <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Create a new song..."
              className="w-full h-10 bg-[#171717] border border-zinc-700 rounded-full px-4 pr-10 text-sm text-white focus:outline-none focus:border-pink-500 transition-all"
              disabled={isGenerating}
           />
           <button type="button" onClick={handleSurpriseMe} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-pink-500">
             <DiceIcon className="w-4 h-4" />
           </button>
        </div>
        <div className="w-32 hidden sm:block">
            <VersionSelector />
        </div>
        <button type="submit" disabled={isGenerating || !description.trim()} className="h-10 px-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full font-bold text-xs hover:from-pink-500 hover:to-purple-500 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-pink-600/20">
            {isGenerating ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <SparklesIcon className="w-4 h-4" />}
            <span>Create</span>
        </button>
      </form>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="self-center flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 backdrop-blur-sm">
          <button type="button" onClick={() => setMode('simple')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'simple' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Simple</button>
          <button type="button" onClick={() => setMode('studio')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'studio' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Studio</button>
          <button type="button" onClick={() => setMode('custom')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'custom' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Custom</button>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        {mode === 'simple' && (
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="relative flex items-center">
                    <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your song idea..."
                    className="w-full h-20 bg-[#171717] border border-zinc-800 rounded-3xl pl-8 pr-48 text-lg text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 shadow-2xl transition-all"
                    />
                    <div className="absolute right-3 top-3 bottom-3 flex items-center gap-2">
                        <button type="button" onClick={handleSurpriseMe} className="h-full px-4 text-zinc-500 hover:text-pink-400 hover:bg-zinc-800 rounded-2xl transition-all"><DiceIcon className="w-6 h-6" /></button>
                        <button type="submit" disabled={isGenerating || !description.trim()} className="h-full px-8 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:from-pink-500 hover:to-purple-500 transition-all shadow-lg shadow-pink-600/30 active:scale-95">
                            {isGenerating ? "Creating..." : "Create"}
                        </button>
                    </div>
                </div>
                <div className="max-w-xs mx-auto">
                    <VersionSelector />
                </div>
            </div>
        )}

        {mode === 'studio' && (
            <div className="bg-[#171717] p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Core Genre</label>
                        <div className="flex flex-wrap gap-2">
                            {GENRES.map(g => (
                                <button key={g} type="button" onClick={() => setStudioGenre(g)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${studioGenre === g ? 'bg-pink-600/10 border-pink-500 text-pink-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>{g}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Vibe & Mood</label>
                        <div className="flex flex-wrap gap-2">
                            {MOODS.map(m => (
                                <button key={m} type="button" onClick={() => setStudioMood(m)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${studioMood === m ? 'bg-indigo-600/10 border-indigo-500 text-indigo-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>{m}</button>
                            ))}
                        </div>
                    </div>
                    <VersionSelector />
                </div>

                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end ml-1">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Tempo Control</label>
                            <span className="text-2xl font-black text-pink-500 font-mono leading-none">{studioTempo} <span className="text-[10px] text-zinc-600">BPM</span></span>
                        </div>
                        <input 
                            type="range" min="60" max="200" value={studioTempo} 
                            onChange={(e) => setStudioTempo(parseInt(e.target.value))}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-600"
                        />
                    </div>
                    <div className="space-y-3">
                         <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Project Topic</label>
                         <input 
                            type="text" placeholder="e.g. A journey through a digital forest..." 
                            value={studioTopic} onChange={(e) => setStudioTopic(e.target.value)}
                            className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 text-sm text-white focus:border-pink-500 transition-all"
                         />
                    </div>
                    <button type="submit" disabled={isGenerating} className="w-full h-16 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:from-pink-500 hover:to-purple-500 transition-all shadow-xl shadow-pink-600/30 flex items-center justify-center gap-3 active:scale-95">
                         {isGenerating ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <SparklesIcon className="w-6 h-6" />}
                         <span>Generate Production</span>
                    </button>
                </div>
            </div>
        )}

        {mode === 'custom' && (
            <div className="flex flex-col gap-4 bg-[#171717] p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl max-w-5xl mx-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                         <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Write Your Lyrics</label>
                         <textarea
                             value={customLyrics} onChange={(e) => setCustomLyrics(e.target.value)}
                             placeholder="Start typing your story..."
                             className="w-full h-[240px] bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-sm text-white placeholder-zinc-700 focus:border-pink-500 resize-none custom-scrollbar"
                         />
                     </div>
                     <div className="flex flex-col gap-6">
                         <div className="space-y-3">
                             <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Style Reference</label>
                             <input type="text" value={customStyle} onChange={(e) => setCustomStyle(e.target.value)} placeholder="e.g. 80s Rock, Modern Soul" className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 text-sm" />
                         </div>
                         <div className="space-y-3">
                             <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Song Title</label>
                             <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Untitled Track" className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 text-sm" />
                         </div>
                         <VersionSelector />
                         <div className="flex-1 flex flex-col justify-end gap-3">
                             <button type="submit" disabled={isGenerating} className="w-full h-16 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:from-pink-500 hover:to-purple-500 transition-all shadow-xl shadow-pink-600/30 active:scale-95">
                                 {isGenerating ? "Processing..." : "Compose Music"}
                             </button>
                         </div>
                     </div>
                 </div>
            </div>
        )}
      </form>
    </div>
  );
};
