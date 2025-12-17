
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SongData } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates song lyrics and structure based on user input.
 * Implements Suno-style logic: Universal genre support, deep structure, and detailed meta-tags.
 */
export const generateSongLyrics = async (
  topic: string,
  genre: string,
  mood: string,
  language: string
): Promise<SongData> => {
  // Advanced Suno-Style Persona
  const prompt = `You are an advanced AI Music Composition Engine (Suno-style).

  YOUR GOAL:
  Create a complete, professional song structure based on the user's request.
  You are NOT a chatbot. You are a music generation backend.

  INPUT ANALYSIS:
  - Topic: "${topic}"
  - Requested Genre: "${genre}" (If 'Auto-Detect', infer from topic. Support ALL genres: Metal, Pop, Classical, Bollywood, Folk, etc.)
  - Requested Mood: "${mood}" (If 'Auto-Detect', infer from topic)
  - Language Preference: "${language}" (If 'Auto', detect language strictly from the Topic text. e.g. Bengali topic -> Bengali lyrics).

  GENERATION RULES (SUNO LOGIC):
  1. **Universal Genre Support**: You can generate ANY style. Do not bias towards EDM/DJ unless requested.
  2. **Structure**: Generate a rich, full song structure.
     - Standard: [Intro], [Verse 1], [Chorus], [Verse 2], [Chorus], [Bridge], [Outro].
     - Electronic: [Intro], [Build Up], [Drop], [Break], [Drop 2], [Outro].
     - Folk/Acoustic: [Verse], [Chorus], [Verse], [Solo], [Chorus].
     - **TAGS**: Use descriptive tags in the 'type' field to guide the listener (e.g., "Verse 1 - Melodic Flow", "Chorus - Power Anthem", "Drop - Heavy Bass", "Intro - Pluck + FX").
  3. **Lyrics**:
     - Must be rhythmic, rhyming, and fit the syllable count of the genre.
     - NO "Here is your song" or chatty text.
     - Language MUST match the input language strictly.
  4. **Creative Control**:
     - If the user provides a simple topic, expand it into a full narrative.
     - If the user implies a specific style in the topic (e.g. "a sad song"), override the 'Auto' mood.

  OUTPUT FORMAT:
  Return ONLY the raw JSON object matching the schema.
  `;

  return fetchFormattedLyrics(prompt, language);
};

/**
 * Analyzes custom user lyrics and formats them.
 * Adapts raw text into a musical structure.
 */
export const analyzeCustomLyrics = async (
  lyrics: string,
  genre: string,
  title: string,
  autoEnhance: boolean = false
): Promise<SongData> => {
  
  const strictPrompt = `You are a Strict Music Arranger.
  YOUR GOAL: Format the User's lyrics into a song structure WITHOUT changing the words.
  
  RULES:
  1. Use the lyrics EXACTLY as provided. Do not add new verses. Do not change words.
  2. Only add structure tags (e.g., [Verse], [Chorus]) above the lines.
  3. If the lyrics are very short, just wrap them in a single [Verse] or [Chorus] block.
  4. Detect the Style and Mood based on the text.
  `;

  const creativePrompt = `You are a Creative Music Producer / Co-Writer.
  YOUR GOAL: Take the user's lyrics as a base/seed and create a full, professional song.
  
  RULES:
  1. Use the provided lyrics as the core theme/chorus.
  2. EXPAND the song: Add Intro, verses, bridge, and Outro if they are missing.
  3. Improve rhymes and rhythm if necessary to fit the genre.
  4. Make it a complete, hit-potential song structure.
  `;

  const basePrompt = `
  INPUTS:
  - Title: "${title}" (If empty, generate a creative title)
  - Style: "${genre}" (If 'Auto-Detect', analyze lyrics)
  - Raw Lyrics: "${lyrics}"

  OUTPUT FORMAT:
  Return ONLY the raw JSON object.
  `;

  const prompt = (autoEnhance ? creativePrompt : strictPrompt) + basePrompt;

  return fetchFormattedLyrics(prompt, "Auto");
};

/**
 * Fix: Updated model to gemini-3-flash-preview for text generation tasks as per guidelines.
 */
async function fetchFormattedLyrics(prompt: string, language: string): Promise<SongData> {
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
                  type: { type: Type.STRING }, // e.g. "Verse 1 - Melodic", "Chorus - Anthem"
                  content: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    const data = JSON.parse(text) as Omit<SongData, 'language'>;
    return { ...data, language };
  } catch (error) {
    console.error("Error generating/analyzing lyrics:", error);
    // Fallback data in case of failure to prevent app crash
    return {
        title: "Untitled Track",
        style: "Experimental",
        mood: "Unknown",
        lyrics: [{ type: "Error", content: "Could not generate lyrics. Please try again." }],
        language: language
    };
  }
}

/**
 * Generates album art optimized for high-fidelity, cinematic looks.
 */
export const generateAlbumArt = async (title: string, style: string, mood: string): Promise<string> => {
  // Enhanced prompt for diverse, high-quality art across all genres
  const prompt = `High-end digital album art for a music track.
  Title: "${title}"
  Genre: ${style}
  Mood: ${mood}
  
  Visual Style: Professional, cinematic, trending on ArtStation, 4k, incredibly detailed.
  
  ADAPTIVE DIRECTION:
  - Electronic/DJ: Neon, Cyberpunk, Geometric, Digital Abstract.
  - Folk/Acoustic: Natural landscapes, Warm lighting, Textured, Organic.
  - Metal/Rock: Gritty, Dark, Surreal, Intense, High Contrast.
  - Classical/Orchestral: Elegant, Grand, Abstract flow, Marble/Gold textures.
  - Pop: Vibrant, Colorful, Minimalist, Stylish.
  
  CONSTRAINT: Avoid text on the image. High quality only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating art:", error);
    // Return a transparent pixel or empty string if art fails, handled by UI
    throw error;
  }
};

/**
 * Generates audio output using standard TTS as fallback.
 * The 'native-audio' model was failing with 404, so we revert to 'gemini-2.5-flash-preview-tts'.
 * This model reads text, so we cannot send it complex acting instructions, or it will read them aloud.
 */
export async function* generateSpeechStream(
    text: string, 
    style: string = 'Acoustic', 
    mood: string = 'Neutral', 
    voiceName: 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr' | 'Charon' = 'Fenrir'
) {
    try {
        // Clean the text: remove [Verse], [Chorus] tags so the TTS doesn't say "Bracket Verse One"
        // Also add pauses for rhythm
        const cleanText = text
            .replace(/\[.*?\]/g, '') // Remove [Verse], [Chorus]
            .replace(/\n/g, '. ');    // Add pause at newlines

        const safeText = cleanText.slice(0, 2000);

        const result = await ai.models.generateContentStream({
            model: "gemini-2.5-flash-preview-tts", 
            contents: [{ parts: [{ text: safeText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        // Changed to Fenrir for a deeper, more rhythmic voice usually
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        for await (const chunk of result) {
            const base64Audio = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                yield decode(base64Audio);
            }
        }
    } catch (error) {
        console.error("Error generating speech stream:", error);
        throw error;
    }
}

/**
 * Legacy single-call speech generation
 */
export const generateSpeech = async (
    text: string, 
    style: string = 'Acoustic', 
    mood: string = 'Neutral',
    voiceName: 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr' | 'Charon' = 'Fenrir'
): Promise<AudioBuffer> => {
  try {
    const cleanText = text.replace(/\[.*?\]/g, '').replace(/\n/g, '. ');
    const safeText = cleanText.slice(0, 2000); 
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: safeText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    return await createAudioBufferFromBytes(decode(base64Audio));

  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

// --- Audio Helpers ---

export async function createAudioBufferFromBytes(data: Uint8Array): Promise<AudioBuffer> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    return await decodeAudioData(data, audioContext, 24000, 1);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
