/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";

interface UseSpeechToTextOptions {
  onResult: (text: string) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onInterimUpdate?: (text: string) => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

// User-friendly error messages
function getSpeechErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "permission-denied":
      return "Microphone access denied. Please allow mic permission and try again.";
    case "no-speech":
      return "No speech detected. Please speak louder or check your microphone.";
    case "audio-capture":
      return "No microphone found. Please connect a microphone.";
    case "network":
      return "Network error. Please check your internet connection.";
    case "aborted":
      return "Speech recognition was stopped.";
    case "no-match":
      return "Speech not recognized. Please try again.";
    default:
      return "Speech recognition error. Please try again.";
  }
}

export function useSpeechToText({ onResult, onEnd, onError, onInterimUpdate }: UseSpeechToTextOptions) {
  const [isListening, setIsListening] = React.useState(false);
  const [interimText, setInterimText] = React.useState("");
  const [isSupported, setIsSupported] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const [audioLevel, setAudioLevel] = React.useState(0);

  // Cleanup audio analysis
  const cleanupAudioAnalysis = React.useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Start audio level analysis
  const startAudioAnalysis = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 128);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
      // Stop the stream tracks after getting the analyser connected
      stream.getTracks().forEach(track => track.stop());
    } catch {
      // Silent fail - audio level is optional enhancement
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognitionClass() as SpeechRecognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMessage(null);
      startAudioAnalysis();
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
      setAudioLevel(0);
      cleanupAudioAnalysis();
      onEnd?.();
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const friendlyMessage = getSpeechErrorMessage(event.error);
      setErrorMessage(friendlyMessage);
      setIsListening(false);
      setInterimText("");
      setAudioLevel(0);
      cleanupAudioAnalysis();
      onError?.(event.error);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      setInterimText(interim);
      if (interim) {
        onInterimUpdate?.(interim);
      }
      if (final) {
        onResult(final);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      cleanupAudioAnalysis();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onResult, onEnd, onError, onInterimUpdate, startAudioAnalysis, cleanupAudioAnalysis]);

  const toggleListening = React.useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setErrorMessage(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start recognition:", err);
        setErrorMessage("Failed to start voice input. Please try again.");
      }
    }
  }, [isListening]);

  return {
    isListening,
    interimText,
    toggleListening,
    isSupported,
    errorMessage,
    audioLevel,
  };
}
