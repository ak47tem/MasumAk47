
import React, { useState } from 'react';
import { SongData } from '../types';
import { HeartIcon, ThumbUpIcon, CopyIcon, SendIcon } from './Icons';

interface LyricsDisplayProps {
  song: SongData;
  onRefine?: (refinement: string) => void;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ song, onRefine }) => {
  const [activeTab, setActiveTab] = useState<'lyrics' | 'structure'>('lyrics');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = song.lyrics.map(s => `[${s.type}]\n${s.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#171717] border border-zinc-800 rounded-2xl h-full min-h-[500px] flex flex-col shadow-xl">
        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
            <button 
               onClick={() => setActiveTab('lyrics')}
               className={`flex-1 py-4 text-sm font-bold transition-colors relative ${activeTab === 'lyrics' ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Lyrics
                {activeTab === 'lyrics' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-600 to-purple-600"></div>}
            </button>
            <button 
               onClick={() => setActiveTab('structure')}
               className={`flex-1 py-4 text-sm font-bold transition-colors relative ${activeTab === 'structure' ? 'text-pink-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Structure Analysis
                {activeTab === 'structure' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-600 to-purple-600"></div>}
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {activeTab === 'lyrics' ? (
                <div className="space-y-8 text-center md:text-left">
                    {song.lyrics.map((section, idx) => (
                        <div key={idx} className="space-y-2">
                             <div className="text-xs font-bold text-pink-500/80 uppercase tracking-widest">{section.type}</div>
                             <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap font-medium text-lg">
                                 {section.content}
                             </p>
                        </div>
                    ))}
                    <div className="pt-4 flex justify-center md:justify-start">
                        <button onClick={handleCopy} className="text-xs font-bold text-zinc-500 hover:text-pink-400 flex items-center gap-2 uppercase tracking-wider transition-colors">
                            <CopyIcon className="w-4 h-4" /> {copied ? 'Copied' : 'Copy Text'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Detected Intent</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Detected Mood</label>
                                <div className="text-white font-medium">{song.mood}</div>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Musical Style</label>
                                <div className="text-white font-medium">{song.style}</div>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Language</label>
                                <div className="text-white font-medium">{song.language}</div>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Structure Segments</label>
                                <div className="text-white font-medium">{song.lyrics.length} Parts</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                         <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Composition Map</h3>
                         <div className="space-y-2">
                             {song.lyrics.map((section, idx) => (
                                 <div key={idx} className="flex items-center gap-3">
                                     <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                                         {idx + 1}
                                     </div>
                                     <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                         <div className="h-full bg-gradient-to-r from-pink-600 to-purple-600 opacity-50 w-full"></div>
                                     </div>
                                     <span className="text-xs text-pink-400 font-bold uppercase">{section.type}</span>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Input */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
             <form 
                onSubmit={(e) => {
                    e.preventDefault();
                    if(input.trim()) {
                        onRefine?.(input);
                        setInput('');
                    }
                }}
                className="relative"
             >
                 <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Refine intent..."
                    className="w-full bg-[#0a0a0a] border border-zinc-700 rounded-full py-3 pl-5 pr-12 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500"
                 />
                 <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full hover:from-pink-500 hover:to-purple-500 transition-all active:scale-95 shadow-md">
                     <SendIcon className="w-4 h-4" />
                 </button>
             </form>
        </div>
    </div>
  );
};
