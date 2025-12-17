
import React, { useState } from 'react';
import { HelpIcon, InfoIcon, SparklesIcon, SendIcon, MusicIcon } from './Icons';

export const HelpCenter: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 5000);
        setEmail('');
        setMessage('');
    };

    const faqs = [
        {
            category: "শুরু করা",
            items: [
                { q: "গান কিভাবে তৈরি করব?", a: "প্রথমে 'Create' ট্যাবে যান, তারপর আপনার গানের বিষয়বস্তু লিখে 'Create' বাটনে ক্লিক করুন। বাকি কাজ আমাদের AI করে দেবে।" },
                { q: "সুনো এআই (Suno AI) কি এখানে ব্যবহার করা হয়েছে?", a: "আমরা জেমিনি ৩ (Gemini 3) এর সবচাইতে আধুনিক মডেল ব্যবহার করি যা গানের লিরিক্স এবং বিট তৈরিতে প্রফেশনাল ফলাফল দেয়।" }
            ]
        },
        {
            category: "অডিও এবং ডাউনলোড",
            items: [
                { q: "অডিও ডাউনলোড হচ্ছে না কেন?", a: "নিশ্চিত করুন যে অডিও জেনারেশন পুরোপুরি শেষ হয়েছে। প্রসেসিং চলাকালীন ডাউনলোড বাটনটি বন্ধ থাকে।" },
                { q: "অডিওর মান (Quality) কেমন?", a: "আমরা হাই-ফেডেলিটি WAV ফরম্যাটে অডিও প্রদান করি যা স্টুডিও কোয়ালিটির কাছাকাছি।" }
            ]
        }
    ];

    return (
        <div className="p-4 md:p-10 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-y-auto custom-scrollbar">
            {/* Header with Status */}
            <div className="mb-12 text-center relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold uppercase tracking-widest mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    System Operational
                </div>
                <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">কিভাবে সাহায্য করতে পারি?</h1>
                <p className="text-zinc-400 max-w-xl mx-auto">MasumAk47 AI মিউজিক স্টুডিও নিয়ে আপনার যেকোনো প্রশ্ন বা সমস্যার সমাধান এখানে পাবেন।</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: FAQ */}
                <div className="lg:col-span-2 space-y-8">
                    {faqs.map((cat, idx) => (
                        <div key={idx} className="space-y-4">
                            <h2 className="text-sm font-black text-pink-500 uppercase tracking-[0.2em] px-2">{cat.category}</h2>
                            <div className="space-y-3">
                                {cat.items.map((item, i) => (
                                    <details key={i} className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-zinc-700">
                                        <summary className="list-none p-5 cursor-pointer flex items-center justify-between font-bold text-zinc-200 group-open:text-pink-400">
                                            {item.q}
                                            <PlusIcon className="w-4 h-4 transition-transform group-open:rotate-45" />
                                        </summary>
                                        <div className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/50 pt-4">
                                            {item.a}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Column: Contact & Support */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-pink-600 to-purple-700 rounded-3xl p-1 shadow-2xl">
                        <div className="bg-zinc-950 rounded-[22px] p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <SendIcon className="w-5 h-5 text-pink-500" />
                                <h3 className="font-bold text-lg">মেসেজ পাঠান</h3>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <input 
                                    type="email" 
                                    required
                                    placeholder="আপনার ইমেইল"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-all"
                                />
                                <textarea 
                                    required
                                    placeholder="আপনার সমস্যা বিস্তারিত লিখুন..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 min-h-[100px] resize-none transition-all"
                                ></textarea>
                                <button type="submit" disabled={submitted} className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-pink-500 hover:to-purple-500 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-pink-600/30">
                                    {submitted ? 'পাঠানো হয়েছে!' : 'পাঠান'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">অন্যান্য মাধ্যম</h4>
                        <div className="space-y-3">
                            <a href="mailto:support@masumak47.ai" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"><InfoIcon className="w-4 h-4 text-zinc-400" /></div>
                                <span className="text-sm font-medium text-zinc-300">support@masumak47.ai</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper for details icon
const PlusIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14"></path>
      <path d="M12 5v14"></path>
    </svg>
);
