"use client";

import { useState, useEffect, useRef } from "react";

interface VoiceControlsProps {
  onSpeechResult: (text: string) => void;
  textToSpeak?: string;
}

export default function VoiceControls({ onSpeechResult, textToSpeak }: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            onSpeechResult(transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onSpeechResult]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (textToSpeak) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Speech-to-Text Mic Button */}
      {supported && (
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? "Stop listening" : "Speak question (Voice Input)"}
          className={`p-2.5 rounded-xl border transition flex items-center justify-center ${
            isListening
              ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700/80"
          }`}
        >
          {isListening ? "🎙️..." : "🎤"}
        </button>
      )}

      {/* Text-to-Speech Reader Button */}
      {textToSpeak && (
        <button
          type="button"
          onClick={toggleSpeech}
          title={isSpeaking ? "Stop reading" : "Read response aloud (AI Voice)"}
          className={`p-2.5 rounded-xl border transition flex items-center justify-center ${
            isSpeaking
              ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40 animate-pulse"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700/80"
          }`}
        >
          {isSpeaking ? "🔊 Pause" : "🔊 Read"}
        </button>
      )}
    </div>
  );
}
