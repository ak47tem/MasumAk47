
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
    // Auto-login for demo purposes or keep as false
    setIsLoggedIn(true); 
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
            updateSong(song.id, { albumArtUrl: artUrl, status: 'generating_audio' });

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
            updateSong(song.id, { status: 'completed' });
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
              w-full py-2.5 px-3 rounded-xl flex items-center gap-3 transition-all font-medium text-sm
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
                  <div className="p-6 md:p-10 max-w-5xl mx-auto w-full animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
                      <div className="mb-8 text-center md:text-left">
                          <div className="text-pink-500 font-black uppercase tracking-[0.2em] text-[10px] mb-2">Master Production Hub</div>
                          <h1 className="text-4xl font-bold mb-2 tracking-tight">স্বাগতম, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">MasumAk47</span></h1>
                          <p className="text-zinc-400">আজ কি নতুন গান তৈরি করবেন?</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                          <div onClick={() => navigateTo('create')} className="p-8 rounded-3xl bg-gradient-to-br from-pink-900/40 to-zinc-900 border border-pink-500/20 cursor-pointer hover:border-pink-500/50 transition-all group shadow-xl">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-pink-900/30 group-hover:scale-110 transition-transform">
                                  <SparklesIcon className="w-7 h-7" />
                              </div>
                              <h3 className="font-bold text-2xl mb-2">Quick Create</h3>
                              <p className="text-sm text-zinc-400 leading-relaxed">MasumAk47 AI এর সাহায্যে সরাসরি প্রফেশনাল গান তৈরি করুন।</p>
                          </div>
                          <div onClick={() => navigateTo('library')} className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all shadow-xl group">
                              <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-300 mb-6 group-hover:bg-zinc-700 transition-colors">
                                  <LibraryIcon className="w-7 h-7" />
                              </div>
                              <h3 className="font-bold text-2xl mb-2">Your Library</h3>
                              <p className="text-sm text-zinc-400 leading-relaxed">{history.length} টি মাস্টারপিস আপনার সংগ্রহে আছে।</p>
                          </div>
                          <div onClick={() => navigateTo('help')} className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all shadow-xl group">
                              <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-300 mb-6 group-hover:bg-zinc-700 transition-colors">
                                  <HelpIcon className="w-7 h-7" />
                              </div>
                              <h3 className="font-bold text-2xl mb-2">Help Center</h3>
                              <p className="text-sm text-zinc-400 leading-relaxed">যেকোনো টেকনিক্যাল সমস্যায় সরাসরি সমাধান পান।</p>
                          </div>
                      </div>
                  </div>
              );
          case 'create':
              return (
                  <div className="min-h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700 overflow-y-auto">
                     <div className="max-w-5xl w-full py-12">
                         <div className="mb-3 flex items-center justify-center gap-3">
                             <div className="h-px w-8 bg-pink-500/30"></div>
                             <div className="text-pink-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">MasumAk47 Audio Engine</div>
                             <div className="h-px w-8 bg-pink-500/30"></div>
                         </div>
                         <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white via-pink-200 to-pink-600">Create Magic.</h1>
                         <p className="text-zinc-400 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">আপনার কল্পনাকে সুরে রূপান্তর করুন <span className="text-pink-500 font-bold">MasumAk47</span> এর শক্তিশালী AI মিউজিক স্টুডিও দিয়ে।</p>
                         <div className="mb-12"><ControlPanel variant="hero" onSubmit={handleGenerate} status={globalStatus} /></div>
                     </div>
                  </div>
              );
          case 'studio':
              if (!activeSong) return (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800"><MusicIcon className="w-10 h-10 text-zinc-600" /></div>
                      <h2 className="text-2xl font-bold mb-4">কোনো গান সিলেক্ট করা নেই</h2>
                      <div className="flex gap-4">
                          <button onClick={() => navigateTo('create')} className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-bold text-sm text-white hover:from-pink-500 hover:to-purple-500 transition-all shadow-xl shadow-pink-600/20 active:scale-95">নতুন গান বানান</button>
                          <button onClick={() => navigateTo('library')} className="px-8 py-4 bg-zinc-800 rounded-2xl font-bold text-sm text-white hover:bg-zinc-700 transition-all active:scale-95">লাইব্রেরিতে যান</button>
                      </div>
                  </div>
              );
              return (
                  <div className="h-full flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-right-4 duration-500">
                      <div className="w-full md:w-[400px] lg:w-[480px] p-6 md:border-r border-zinc-800 bg-[#0a0a0a] flex flex-col gap-6 overflow-y-auto shrink-0 custom-scrollbar">
                          <div className="aspect-square w-full rounded-[2rem] overflow-hidden bg-zinc-900 border border-zinc-800 relative group shadow-2xl">
                             {activeSong.albumArtUrl ? (
                                 <><img src={activeSong.albumArtUrl} className="w-full h-full object-cover" alt="Cover" />
                                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                     <a href={activeSong.albumArtUrl} download={`${activeSong.data.title}.png`} className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 transform hover:scale-105 transition-all shadow-xl shadow-pink-600/30"><DownloadIcon className="w-4 h-4" /> Save Art</a>
                                 </div></>
                             ) : (
                                 <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-500">
                                     <div className="relative">
                                         <div className="w-12 h-12 border-4 border-zinc-800 border-t-pink-500 rounded-full animate-spin"></div>
                                         <div className="absolute inset-0 flex items-center justify-center"><MusicIcon className="w-4 h-4 text-pink-500/50" /></div>
                                     </div>
                                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-500/80">Designing Artwork</span>
                                 </div>
                             )}
                          </div>
                          <div className="space-y-1">
                              <h2 className="text-3xl font-bold leading-tight text-white">{activeSong.data.title}</h2>
                              <div className="flex items-center gap-2 text-[10px] font-black text-pink-500/60 uppercase tracking-[0.2em]">
                                  <span>{activeSong.data.style}</span>
                                  <span>•</span>
                                  <span>{activeSong.data.tempo || 120} BPM</span>
                              </div>
                          </div>
                          <div className="bg-zinc-900/50 rounded-3xl p-5 border border-zinc-800 shadow-xl">
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
                      <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold">Your Masterpieces</h1>
                        <button onClick={() => navigateTo('create')} className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                            <PlusIcon className="w-4 h-4" /> New Track
                        </button>
                      </div>
                      {history.length === 0 ? (
                           <div className="flex flex-col items-center justify-center py-32 text-center text-zinc-600">
                               <LibraryIcon className="w-20 h-20 mb-6 opacity-10" />
                               <p className="text-lg">আপনার লাইব্রেরি বর্তমানে খালি।</p>
                               <button onClick={() => navigateTo('create')} className="mt-4 text-pink-500 font-bold hover:underline">প্রথম গানটি তৈরি করুন</button>
                           </div>
                      ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {history.map(song => (
                                  <div key={song.id} onClick={() => { setActiveSongId(song.id); navigateTo('studio'); }} className="group bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden cursor-pointer hover:border-pink-500/30 transition-all shadow-lg hover:shadow-pink-500/10">
                                      <div className="aspect-square bg-zinc-800 relative overflow-hidden">
                                          {song.albumArtUrl ? (
                                              <img src={song.albumArtUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={song.data.title} />
                                          ) : (
                                              <div className="w-full h-full flex items-center justify-center bg-zinc-900"><MusicIcon className="w-8 h-8 text-zinc-700" /></div>
                                          )}
                                          <button onClick={(e) => { e.stopPropagation(); handleDelete(song.id); }} className="absolute top-4 right-4 p-2.5 rounded-xl bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 transform hover:scale-110"><TrashIcon className="w-4 h-4" /></button>
                                      </div>
                                      <div className="p-5">
                                          <h3 className="font-bold text-white truncate text-lg">{song.data.title}</h3>
                                          <div className="flex justify-between items-center mt-2">
                                            <p className="text-xs text-zinc-500 font-medium truncate">{song.data.style}</p>
                                            <span className="text-[9px] font-black text-pink-500/60 uppercase tracking-widest">{song.data.tempo || 120} BPM</span>
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
              return <div className="p-10 text-center text-zinc-500">View not found</div>;
      }
  };

  return (
    <div className="flex h-screen bg-mesh text-white selection:bg-pink-500 selection:text-white overflow-hidden font-sans">
      {/* Sidebar with Highlighted Branding */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-zinc-800 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col shrink-0 shadow-2xl`}>
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between h-20">
              <div className="flex items-center gap-3 font-black text-xl">
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-pink-600/20 transform rotate-3">
                      <MusicIcon className="w-5 h-5" />
                  </div>
                  <span className="tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]">MasumAk47</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-zinc-400 hover:text-white transition-colors">✕</button>
          </div>
          <div className="p-4 flex flex-col gap-1.5 overflow-y-auto flex-1 custom-scrollbar">
              <NavItem view="home" icon={HomeIcon} label="Home" />
              <NavItem view="create" icon={SparklesIcon} label="Create New" />
              <NavItem view="studio" icon={MusicIcon} label="Studio" />
              <NavItem view="library" icon={LibraryIcon} label="Library" />
              <NavItem view="search" icon={SearchIcon} label="Search" />
              <div className="h-px bg-zinc-800/50 mx-3 my-5"></div>
              <div className="px-4 mb-2 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Support</div>
              <NavItem view="notifications" icon={BellIcon} label="Notifications" />
              <NavItem view="help" icon={HelpIcon} label="Help Center" />
              <NavItem view="profile" icon={UserIcon} label="Profile" />
          </div>
          <div className="p-5 border-t border-zinc-800 bg-zinc-950/50">
              <div className="mb-4 flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
                  <span>Balance</span>
                  <span className="text-pink-500">{credits} Credits</span>
              </div>
              <button onClick={() => navigateTo('create')} className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:from-pink-500 hover:to-purple-500 transition-all shadow-xl shadow-pink-600/30 active:scale-95">
                  <PlusIcon className="w-4 h-4" /> Start Project
              </button>
          </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative w-full overflow-hidden">
          <header className="h-16 border-b border-zinc-800 flex items-center px-6 justify-between bg-[#0a0a0a]/90 backdrop-blur-xl z-20 shrink-0">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-zinc-400 hover:text-pink-500"><GridIcon className="w-6 h-6" /></button>
             {currentView === 'studio' && activeSong && (
                <div className="hidden md:block w-full max-w-xl animate-in slide-in-from-top-2 duration-300">
                    <ControlPanel variant="compact" onSubmit={handleGenerate} status={globalStatus} />
                </div>
             )}
             <div className="flex items-center gap-5 ml-auto">
                <div className="hidden lg:flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-black font-mono text-zinc-500 tracking-widest uppercase">Engine Online</span>
                </div>
                <div className="h-6 w-px bg-zinc-800 hidden sm:block"></div>
                <div className="text-[11px] font-black font-mono text-pink-500 tracking-[0.3em] whitespace-nowrap uppercase drop-shadow-[0_0_10px_rgba(219,39,119,0.3)]">MasumAk47 STUDIO</div>
             </div>
          </header>

          <div className="flex-1 relative overflow-hidden bg-zinc-950/20">
              {error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-50">
                      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20"><TrashIcon className="w-8 h-8 text-red-500" /></div>
                      <h3 className="text-xl font-bold mb-2">Something went wrong</h3>
                      <p className="text-zinc-500 text-sm max-w-sm mb-6">{error}</p>
                      <button onClick={() => setError(null)} className="px-6 py-2 bg-zinc-800 rounded-xl text-white font-bold text-xs">Dismiss</button>
                  </div>
              ) : renderMainContent()}
          </div>

          {/* Floating Help Access */}
          <button 
            onClick={() => navigateTo('help')}
            className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group border-4 border-[#0a0a0a] shadow-pink-600/30"
            title="MasumAk47 Support"
          >
            <HelpIcon className="w-7 h-7" />
            <span className="absolute right-full mr-4 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl">MasumAk47 Support</span>
          </button>
      </main>

      {/* Account Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-[#171717] border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-600 to-purple-600"></div>
                <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">✕</button>
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-pink-600/20 rotate-6 transform transition-transform hover:rotate-0">
                        <UserIcon className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-3 tracking-tight">MasumAk47 Account</h2>
                    <p className="text-sm text-zinc-500 leading-relaxed px-4">আপনার প্রজেক্টগুলো সেভ করতে এবং AI ইঞ্জিন ব্যবহার করতে লগইন করুন।</p>
                </div>
                <button onClick={() => { setIsLoggedIn(true); setShowLoginModal(false); }} className="w-full py-5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-[1.5rem] font-bold text-sm hover:from-pink-500 hover:to-purple-500 transition-all active:scale-95 shadow-xl shadow-pink-600/30">লগইন / সাইন আপ</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
