
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SongData } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const generateSongLyrics = async (
  topic: string,
  genre: string,
  mood: string,
  language: string,
  version: number
): Promise<SongData> => {
  const versionDescriptions = [
    "Basic structure and simple metaphors.",
    "Standard song structure with better flow.",
    "Professional arrangement with bridge and complex rhyming.",
    "Advanced artistic expression and multi-layered themes.",
    "Ultra-high-end masterpiece with cinematic detail and intricate musicality."
  ];

  const prompt = `You are an advanced AI Music Composition Engine.
  Task: Create a song at Quality Version ${version}/5.
  Quality Intent: ${versionDescriptions[version - 1]}
  Topic: "${topic}"
  Genre: "${genre}"
  Mood: "${mood}"
  Language: "${language}"
  
  Return JSON structure with title, style, mood, and lyrics array. Ensure the complexity matches Version ${version}.`;

  const songData = await fetchFormattedLyrics(prompt, language);
  // Fix: Adding missing required language property
  return { ...songData, version, language };
};

export const analyzeCustomLyrics = async (
  lyrics: string,
  genre: string,
  title: string,
  version: number,
  autoEnhance: boolean = false
): Promise<SongData> => {
  const prompt = `Analyze and structure these lyrics: "${lyrics}". Title: "${title}", Genre: "${genre}". 
  Apply enhancement level: Version ${version}/5. 
  AutoEnhance: ${autoEnhance}. Return JSON.`;
  const songData = await fetchFormattedLyrics(prompt, "Auto");
  // Fix: Adding missing required language property
  return { ...songData, version, language: "Auto" };
};

async function fetchFormattedLyrics(prompt: string, language: string): Promise<Omit<SongData, 'language' | 'version'>> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            style: { type: Type.STRING },
            mood: { type: Type.STRING },
            lyrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error(error);
    return {
        title: "Untitled Track",
        style: "Experimental",
        mood: "Neutral",
        lyrics: [{ type: "Verse", content: "Error loading lyrics." }]
    };
  }
}

export const generateAlbumArt = async (title: string, style: string, mood: string): Promise<string> => {
  const prompt = `Professional album art for "${title}", style: ${style}, mood: ${mood}. High resolution, cinematic, no text.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image");
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export async function* generateSpeechStream(text: string, style: string, mood: string) {
    try {
        const cleanText = text.replace(/\[.*?\]/g, '').slice(0, 2000);
        const result = await ai.models.generateContentStream({
            model: "gemini-2.5-flash-preview-tts", 
            contents: [{ parts: [{ text: cleanText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
            },
        });

        for await (const chunk of result) {
            const base64Audio = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) yield decode(base64Audio);
        }
    } catch (error) {
        console.error(error);
    }
}

export async function createAudioBufferFromBytes(data: Uint8Array): Promise<AudioBuffer> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass({sampleRate: 24000});
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}
