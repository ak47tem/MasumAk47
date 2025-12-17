
import React, { useState, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { LyricsDisplay } from './components/LyricsDisplay';
import { AudioPlayer } from './components/AudioPlayer';
import { HelpCenter } from './components/HelpCenter';
import { 
    MusicIcon, DownloadIcon, PlusIcon, TrashIcon, LibraryIcon, 
    HomeIcon, SearchIcon, BellIcon, UserIcon, GridIcon, SparklesIcon, HelpIcon
} from './components/Icons';
import { SongRequest, GenerationState, GeneratedSong } from './types';
import { generateSongLyrics, generateAlbumArt, generateSpeechStream, analyzeCustomLyrics, createAudioBufferFromBytes } from './services/geminiService';

type ViewState = 'home' | 'create' | 'studio' | 'library' | 'search' | 'notifications' | 'profile' | 'help';

const App: React.FC = () => {
  const [history, setHistory] = useState<GeneratedSong[]>([]);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [globalStatus, setGlobalStatus] = useState<GenerationState>(GenerationState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('create'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credits, setCredits] = useState(50);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem('masum_last_date');
    if (lastReset !== today) {
        setCredits(prev => Math.max(prev, 50));
        localStorage.setItem('masum_last_date', today);
    }
  }, []);

  const activeSong = history.find(s => s.id === activeSongId) || null;

  const updateSong = (id: string, updates: Partial<GeneratedSong>) => {
    setHistory(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleGenerate = async (request: SongRequest) => {
    if (!isLoggedIn) {
        setShowLoginModal(true);
        return;
    }
    const COST = 5;
    if (credits < COST) {
        setShowUpgradeModal(true);
        return;
    }
    setCredits(prev => prev - COST);
    setCurrentView('studio');
    setGlobalStatus(GenerationState.GENERATING_LYRICS);
    setError(null);

    const timestamp = Date.now();
    const batchSongs: GeneratedSong[] = [0, 1].map((index) => {
        const tempId = `${timestamp}-${index}`;
        let displayTitle = request.mode === 'custom' 
            ? (request.topic || "Custom Song") 
            : (request.topic || "Untitled Idea");
        if (index === 1) displayTitle += " (Ver. 2)";
        return {
            id: tempId,
            data: {
                title: displayTitle,
                style: request.genre && request.genre !== 'Auto-Detect' ? request.genre : "Detecting...",
                mood: request.mood || "Detecting...",
                lyrics: [],
                language: "Auto",
                topic: request.topic,
                tempo: request.tempo || 120
            },
            createdAt: timestamp,
            status: 'generating_lyrics'
        };
    });

    setHistory(prev => [...batchSongs, ...prev]);
    setActiveSongId(batchSongs[0].id);

    batchSongs.forEach(async (song) => {
        try {
            let songData;
            if (request.mode === 'custom') {
                songData = await analyzeCustomLyrics(request.customLyrics || '', request.genre || '', request.topic || '', request.autoEnhance || false);
            } else {
                songData = await generateSongLyrics(request.topic || '', request.genre || 'Auto-Detect', request.mood || 'Auto-Detect', request.language || 'Bengali');
            }
            songData.title = song.data.title; 
            songData.topic = request.topic;
            songData.tempo = request.tempo || 120;
            updateSong(song.id, { data: songData, status: 'generating_art' });

            if (song.id === batchSongs[0].id) setGlobalStatus(GenerationState.GENERATING_ART);
            const artUrl = await generateAlbumArt(songData.title, songData.style, songData.mood);
            updateSong(song.id, { albumArtUrl: artUrl, status: 'generating_art' }); // Maintain consistent status update flow

            if (song.id === batchSongs[0].id) setGlobalStatus(GenerationState.GENERATING_AUDIO);
            const lyricsText = songData.lyrics.map(s => s.content).join('\n\n');
            const stream = generateSpeechStream(lyricsText, songData.style, songData.mood);
            let fullAudioData = new Uint8Array(0);
            for await (const chunk of stream) {
                const newAudioData = new Uint8Array(fullAudioData.length + chunk.length);
                newAudioData.set(fullAudioData);
                newAudioData.set(chunk, fullAudioData.length);
                fullAudioData = newAudioData;
                if (fullAudioData.length > 0) {
                     const partialBuffer = await createAudioBufferFromBytes(fullAudioData);
                     updateSong(song.id, { audioBuffer: partialBuffer });
                }
            }
            updateSong(song.id, { albumArtUrl: artUrl, status: 'completed' });
            if (song.id === batchSongs[0].id) setGlobalStatus(GenerationState.COMPLETED);
        } catch (e: any) {
            console.error(e);
            updateSong(song.id, { status: 'error' });
            if (song.id === batchSongs[0].id) {
                setError("Production error. The creative engine encountered an issue.");
                setGlobalStatus(GenerationState.ERROR);
            }
        }
    });
  };

  const handleRefine = (refinement: string) => {
    if (!activeSong?.data.topic) return;
    const newRequest: SongRequest = {
        mode: 'ai',
        topic: `${activeSong.data.topic}. (Refinement: ${refinement})`,
        genre: activeSong.data.style,
        mood: activeSong.data.mood,
        language: 'Auto',
        tempo: activeSong.data.tempo
    };
    handleGenerate(newRequest);
  };

  const handleDelete = (id: string) => {
      setHistory(prev => prev.filter(s => s.id !== id));
      if (activeSongId === id) setActiveSongId(null);
  };

  const navigateTo = (view: ViewState) => {
      setCurrentView(view);
      setIsSidebarOpen(false);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
      <button 
          onClick={() => navigateTo(view)}
          className={`
              w-full py-2.5 px-3 rounded-lg flex items-center gap-3 transition-all font-medium text-sm
              ${currentView === view ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}
          `}
      >
          <Icon className="w-5 h-5" />
          <span>{label}</span>
      </button>
  );

  const renderMainContent = () => {
      switch (currentView) {
          case 'home':
              return (
                  <div className="p-6 md:p-10 max-w-5xl mx-auto w-full animate-in fade-in duration-500 overflow-y-auto">
                      <div className="mb-8 text-center md:text-left">
                          <div className="text-pink-500 font-black uppercase tracking-[0.2em] text-[10px] mb-1">Authenticated Dashboard</div>
                          <h1 className="text-3xl font-bold mb-2 tracking-tight">স্বাগতম, <span className="text-pink-500">MasumAk47</span></h1>
                          <p className="text-zinc-400">আজ কি নতুন গান তৈরি করবেন?</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                          <div onClick={() => navigateTo('create')} className="p-6 rounded-3xl bg-gradient-to-br from-pink-900/40 to-zinc-900 border border-pink-500/20 cursor-pointer hover:border-pink-500/50 transition-all group shadow-xl">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-pink-900/30 group-hover:scale-110 transition-transform">
                                  <SparklesIcon className="w-6 h-6" />
                              </div>
                              <h3 className="font-bold text-xl mb-1">Quick Create</h3>
                              <p className="text-sm text-zinc-400">MasumAk47 AI এর সাহায্যে দ্রুত গান তৈরি করুন।</p>
                          </div>
                          <div onClick={() => navigateTo('library')} className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all shadow-xl">
                              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 mb-4">
                                  <LibraryIcon className="w-6 h-6" />
                              </div>
                              <h3 className="font-bold text-xl mb-1">Your Library</h3>
                              <p className="text-sm text-zinc-400">{history.length} টি গান তৈরি করেছেন।</p>
                          </div>
                          <div onClick={() => navigateTo('help')} className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all shadow-xl">
                              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 mb-4">
                                  <HelpIcon className="w-6 h-6" />
                              </div>
                              <h3 className="font-bold text-xl mb-1">Help Center</h3>
                              <p className="text-sm text-zinc-400">যেকোনো সমস্যায় সরাসরি সাহায্য নিন।</p>
                          </div>
                      </div>
                  </div>
              );
          case 'create':
              return (
                  <div className="min-h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 overflow-y-auto">
                     <div className="max-w-5xl w-full py-12">
                         <div className="mb-2 text-pink-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">MasumAk47 Audio Engine</div>
                         <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white via-pink-200 to-pink-600 drop-shadow-sm">Create Magic.</h1>
                         <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">আপনার কল্পনাকে সুরে রূপান্তর করুন <span className="text-pink-500/80">MasumAk47</span> এর শক্তিশালী AI দিয়ে।</p>
                         <div className="mb-12"><ControlPanel variant="hero" onSubmit={handleGenerate} status={globalStatus} /></div>
                     </div>
                  </div>
              );
          case 'studio':
              if (!activeSong) return (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6"><MusicIcon className="w-10 h-10 text-zinc-600" /></div>
                      <h2 className="text-2xl font-bold mb-2">No song selected</h2>
                      <div className="flex gap-4">
                          <button onClick={() => navigateTo('create')} className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full font-bold text-sm text-white hover:from-pink-500 hover:to-purple-500 transition-all shadow-lg shadow-pink-600/20">Create New</button>
                          <button onClick={() => navigateTo('library')} className="px-6 py-3 bg-zinc-800 rounded-full font-bold text-sm text-white hover:bg-zinc-700 transition-all">Go to Library</button>
                      </div>
                  </div>
              );
              return (
                  <div className="h-full flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-right-4 duration-500">
                      <div className="w-full md:w-[400px] lg:w-[480px] p-6 md:border-r border-zinc-800 bg-[#0a0a0a] flex flex-col gap-6 overflow-y-auto shrink-0 custom-scrollbar">
                          <div className="aspect-square w-full rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 relative group shadow-2xl">
                             {activeSong.albumArtUrl ? (
                                 <><img src={activeSong.albumArtUrl} className="w-full h-full object-cover" alt="Cover" />
                                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <a href={activeSong.albumArtUrl} download={`${activeSong.data.title}.png`} className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full font-bold text-sm flex items-center gap-2 transform hover:scale-105 transition-all shadow-lg shadow-pink-600/20"><DownloadIcon className="w-4 h-4" /> Save Artwork</a>
                                 </div></>
                             ) : (
                                 <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-500"><div className="w-10 h-10 border-2 border-zinc-600 border-t-pink-500 rounded-full animate-spin"></div><span className="text-xs font-mono uppercase tracking-widest text-pink-500/80">Generating Art</span></div>
                             )}
                          </div>
                          <div className="space-y-1">
                              <h2 className="text-3xl font-bold leading-tight text-white">{activeSong.data.title}</h2>
                              <div className="flex items-center gap-2 text-[10px] font-black text-pink-500/50 uppercase tracking-[0.2em]">
                                  <span>{activeSong.data.style}</span>
                                  <span>•</span>
                                  <span>{activeSong.data.tempo || 120} BPM</span>
                              </div>
                          </div>
                          <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 shadow-xl">
                            <AudioPlayer 
                                audioBuffer={activeSong.audioBuffer} 
                                title={activeSong.data.title} 
                                style={activeSong.data.style}
                                tempo={activeSong.data.tempo}
                                isLoading={activeSong.status === 'generating_audio'} 
                                onGenerate={() => {}} 
                            />
                          </div>
                      </div>
                      <div className="flex-1 bg-[#0a0a0a] md:bg-zinc-950/30 overflow-hidden h-full"><LyricsDisplay song={activeSong.data} onRefine={handleRefine} /></div>
                  </div>
              );
          case 'library':
              return (
                  <div className="p-6 md:p-10 w-full h-full overflow-y-auto custom-scrollbar">
                      <h1 className="text-3xl font-bold mb-8">Your Library</h1>
                      {history.length === 0 ? (
                           <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500"><LibraryIcon className="w-16 h-16 mb-4 opacity-20" /><p>আপনার লাইব্রেরি খালি।</p></div>
                      ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {history.map(song => (
                                  <div key={song.id} onClick={() => { setActiveSongId(song.id); navigateTo('studio'); }} className="group bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden cursor-pointer hover:border-pink-500/30 transition-all shadow-lg hover:shadow-pink-500/5">
                                      <div className="aspect-square bg-zinc-800 relative overflow-hidden">
                                          {song.albumArtUrl && <img src={song.albumArtUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={song.data.title} />}
                                          <button onClick={(e) => { e.stopPropagation(); handleDelete(song.id); }} className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80 transform hover:rotate-12"><TrashIcon className="w-4 h-4" /></button>
                                      </div>
                                      <div className="p-5">
                                          <h3 className="font-bold text-white truncate">{song.data.title}</h3>
                                          <div className="flex justify-between items-center mt-1">
                                            <p className="text-xs text-zinc-500 truncate">{song.data.style}</p>
                                            <span className="text-[9px] font-bold text-zinc-600">{song.data.tempo || 120} BPM</span>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              );
          case 'help':
              return <HelpCenter />;
          default:
              return null;
      }
  };

  return (
    <div className="flex h-screen bg-mesh text-white selection:bg-pink-500 selection:text-white overflow-hidden font-sans">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-zinc-800 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col shrink-0`}>
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between h-16">
              <div className="flex items-center gap-2 font-bold text-lg">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                      <MusicIcon className="w-4 h-4" />
                  </div>
                  <span className="tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">MasumAk47</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400">✕</button>
          </div>
          <div className="p-3 flex flex-col gap-1 overflow-y-auto flex-1">
              <NavItem view="home" icon={HomeIcon} label="Home" />
              <NavItem view="create" icon={SparklesIcon} label="Create" />
              <NavItem view="studio" icon={MusicIcon} label="Studio" />
              <NavItem view="library" icon={LibraryIcon} label="Library" />
              <NavItem view="search" icon={SearchIcon} label="Search" />
              <div className="h-px bg-zinc-800 mx-2 my-4"></div>
              <NavItem view="notifications" icon={BellIcon} label="Notifications" />
              <NavItem view="help" icon={HelpIcon} label="Help Center" />
              <NavItem view="profile" icon={UserIcon} label="Profile" />
          </div>
          <div className="p-4 border-t border-zinc-800">
              <div className="mb-3 flex items-center justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest px-1"><span>Credits</span><span className="text-pink-500">{credits}</span></div>
              <button onClick={() => navigateTo('create')} className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-pink-500 hover:to-purple-500 transition-all shadow-lg shadow-pink-600/30"><PlusIcon className="w-4 h-4" /> New Project</button>
          </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative w-full overflow-hidden">
          <header className="h-16 border-b border-zinc-800 flex items-center px-6 justify-between bg-[#0a0a0a]/95 backdrop-blur z-20 shrink-0">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-zinc-400 hover:text-pink-500"><LibraryIcon className="w-6 h-6" /></button>
             {currentView === 'studio' && activeSong && <div className="hidden md:block w-full max-w-xl"><ControlPanel variant="compact" onSubmit={handleGenerate} status={globalStatus} /></div>}
             <div className="flex items-center gap-4">
                <div className="hidden sm:block h-6 w-px bg-zinc-800"></div>
                <div className="text-[10px] font-black font-mono text-pink-500 tracking-[0.3em] whitespace-nowrap uppercase drop-shadow-[0_0_8px_rgba(219,39,119,0.3)]">MasumAk47 STUDIO</div>
             </div>
          </header>

          <div className="flex-1 relative overflow-hidden">{renderMainContent()}</div>

          <button 
            onClick={() => navigateTo('help')}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40 group border-4 border-[#0a0a0a]"
            title="Need Help?"
          >
            <HelpIcon className="w-7 h-7" />
            <span className="absolute right-full mr-3 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Help Center</span>
          </button>
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-[#171717] border border-zinc-800 rounded-[2rem] p-8 shadow-2xl relative">
                <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">✕</button>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-pink-600/20 rotate-3"><UserIcon className="w-8 h-8 text-white" /></div>
                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">MasumAk47 Account</h2>
                    <p className="text-sm text-zinc-500 leading-relaxed">গান তৈরি করার জন্য আপনাকে লগইন করতে হবে।</p>
                </div>
                <button onClick={() => { setIsLoggedIn(true); setShowLoginModal(false); }} className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-bold text-sm hover:from-pink-500 hover:to-purple-500 transition-all active:scale-95 shadow-lg shadow-pink-600/30">লগইন / সাইন আপ</button>
            </div>
        </div>
      )}
      
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-[#171717] border border-zinc-800 rounded-[2rem] p-8 shadow-2xl relative">
                <button onClick={() => setShowUpgradeModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">✕</button>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-600/20 -rotate-3"><SparklesIcon className="w-8 h-8 text-white" /></div>
                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Low Credits</h2>
                    <p className="text-sm text-zinc-500 leading-relaxed">আপনার ক্রেডিট শেষ হয়ে গেছে। ফ্রিতে ৫০ ক্রেডিট পেতে আগামীকাল আবার আসুন অথবা প্রো ভার্সনে যান।</p>
                </div>
                <button onClick={() => { setCredits(prev => prev + 500); setShowUpgradeModal(false); }} className="w-full py-4 bg-yellow-600 text-white rounded-2xl font-bold text-sm hover:bg-yellow-500 transition-all active:scale-95 shadow-lg shadow-yellow-600/30">Upgrade to Pro</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
