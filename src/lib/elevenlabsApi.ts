import { toast } from 'react-hot-toast';

// ElevenLabs API wrapper
class ElevenLabsAPI {
  private apiKey: string;
  private baseUrl: string = 'https://api.elevenlabs.io/v1';
  private voiceId: string = 'JBfgJ1FvSYsdAsyKPrpz'; // Vivien voice ID
  private isPlaying: boolean = false;
  private audioElement: HTMLAudioElement | null = null;
  private hasCredits: boolean = true;

  constructor(apiKey: string = '') {
    this.apiKey = apiKey;
    this.initAudioElement();
  }

  private initAudioElement() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.addEventListener('ended', () => {
        this.isPlaying = false;
      });
    }
  }

  public setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  public setVoiceId(voiceId: string) {
    this.voiceId = voiceId;
  }

  public async textToSpeech(text: string): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('ElevenLabs API key is not set');
      return false;
    }

    if (!this.hasCredits) {
      console.warn('No credits available for ElevenLabs API');
      return false;
    }

    try {
      // In a real implementation, this would call the ElevenLabs API
      // For demo purposes, we'll simulate a successful API call
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate audio playback
      if (this.audioElement) {
        // In a real implementation, this would set the audio source to the API response
        // For demo purposes, we'll use a dummy audio source
        this.audioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        this.isPlaying = true;
        await this.audioElement.play();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error calling ElevenLabs API:', error);
      
      // Check if the error is due to no credits
      if (error.message && error.message.includes('credits')) {
        this.hasCredits = false;
        toast.error('Nincs elég kredit az ElevenLabs API használatához');
      } else {
        toast.error('Hiba a hangszintézis során');
      }
      
      return false;
    }
  }

  public async streamTextToSpeech(text: string): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('ElevenLabs API key is not set');
      return false;
    }

    if (!this.hasCredits) {
      console.warn('No credits available for ElevenLabs API');
      return false;
    }

    try {
      // In a real implementation, this would call the ElevenLabs streaming API
      // For demo purposes, we'll simulate a successful API call
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate audio playback
      if (this.audioElement) {
        // In a real implementation, this would set up a MediaSource for streaming
        // For demo purposes, we'll use a dummy audio source
        this.audioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        this.isPlaying = true;
        await this.audioElement.play();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error calling ElevenLabs streaming API:', error);
      
      // Check if the error is due to no credits
      if (error.message && error.message.includes('credits')) {
        this.hasCredits = false;
        toast.error('Nincs elég kredit az ElevenLabs API használatához');
      } else {
        toast.error('Hiba a hangszintézis során');
      }
      
      return false;
    }
  }

  public stop() {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
    }
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  public hasAvailableCredits(): boolean {
    return this.hasCredits;
  }

  public async getVoices(): Promise<any[]> {
    if (!this.apiKey) {
      console.warn('ElevenLabs API key is not set');
      return [];
    }

    try {
      // In a real implementation, this would call the ElevenLabs API to get available voices
      // For demo purposes, we'll return mock data
      return [
        { voice_id: 'JBfgJ1FvSYsdAsyKPrpz', name: 'Vivien' },
        { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
        { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
        { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella' },
        { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni' }
      ];
    } catch (error) {
      console.error('Error getting ElevenLabs voices:', error);
      return [];
    }
  }
}

// Create a singleton instance
export const elevenlabsApi = new ElevenLabsAPI('sk_7fffe66c1927a086213798cf7fbded13d2cbbfa9a4509f7f');

export default elevenlabsApi;