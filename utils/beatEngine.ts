
export class BeatEngine {
    private ctx: AudioContext;
    private isPlaying: boolean = false;
    private nextNoteTime: number = 0;
    private tempo: number = 120;
    private genre: string = 'Pop';
    private timerID: number | null = null;
    private beatCount: number = 0;
  
    constructor(audioContext: AudioContext) {
      this.ctx = audioContext;
    }
  
    setTempo(bpm: number) {
        this.tempo = bpm;
    }

    setGenre(genre: string) {
        this.genre = genre;
    }

    start() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.beatCount = 0;
      this.nextNoteTime = this.ctx.currentTime;
      this.scheduler();
    }
  
    stop() {
      this.isPlaying = false;
      if (this.timerID) window.clearTimeout(this.timerID);
    }
  
    private scheduler() {
      while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
        this.scheduleNote(this.beatCount, this.nextNoteTime);
        this.nextNote();
      }
      if (this.isPlaying) {
        this.timerID = window.setTimeout(() => this.scheduler(), 25);
      }
    }
  
    private nextNote() {
      const secondsPerBeat = 60.0 / this.tempo;
      this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
      this.beatCount++;
      if (this.beatCount === 16) this.beatCount = 0;
    }
  
    private scheduleNote(beatNumber: number, time: number) {
      const isElectronic = ['Electronic', 'Techno', 'Dance', 'House'].some(g => this.genre.includes(g));
      const isLofi = this.genre.includes('Lo-fi');
      const isRock = this.genre.includes('Rock') || this.genre.includes('Metal');

      // Kick Logic
      if (isElectronic) {
          // 4-on-the-floor
          if (beatNumber % 4 === 0) this.playKick(time, 0.8);
      } else if (isRock) {
          if (beatNumber === 0 || beatNumber === 6 || beatNumber === 8 || beatNumber === 14) this.playKick(time, 0.9);
      } else if (isLofi) {
          if (beatNumber === 0 || beatNumber === 9) this.playKick(time, 0.6);
      } else {
          if (beatNumber === 0 || beatNumber === 8) this.playKick(time, 0.7);
      }
      
      // Snare Logic
      if (isElectronic || isLofi || !isRock) {
          if (beatNumber === 4 || beatNumber === 12) this.playSnare(time);
      } else {
          // Rock backbeat
          if (beatNumber === 4 || beatNumber === 12) this.playSnare(time, 0.9);
      }
  
      // Hi-Hat Logic
      if (isElectronic) {
          if (beatNumber % 2 === 0) this.playHiHat(time, 0.15);
          if (beatNumber % 4 === 2) this.playHiHat(time, 0.3, true); // Open hat
      } else {
          if (beatNumber % 2 === 0) this.playHiHat(time, 0.2);
      }

      // Bass note Logic
      const rootFreq = isRock ? 41.20 : (isLofi ? 73.42 : 55.0); // E1 vs D2 vs A1
      if (beatNumber === 0) this.playBass(time, rootFreq);
      if (beatNumber === 8) this.playBass(time, rootFreq * 0.75); // Perfect 4th/5th shift
    }
  
    private playKick(time: number, vol: number) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
  
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
  
      osc.start(time);
      osc.stop(time + 0.5);
    }
  
    private playSnare(time: number, vol: number = 0.5) {
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      
      noiseGain.gain.setValueAtTime(vol, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      noise.start(time);
    }
  
    private playHiHat(time: number, vol: number, isOpen: boolean = false) {
      const bufferSize = this.ctx.sampleRate * (isOpen ? 0.2 : 0.05);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 10000;
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + (isOpen ? 0.2 : 0.05));
  
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(time);
    }

    private playBass(time: number, freq: number) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = this.genre.includes('Lo-fi') ? 'sine' : 'sawtooth';
        osc.connect(gain);
        gain.connect(this.ctx.destination);
    
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.linearRampToValueAtTime(0, time + 1.0);
    
        osc.start(time);
        osc.stop(time + 1.0);
      }
  }
