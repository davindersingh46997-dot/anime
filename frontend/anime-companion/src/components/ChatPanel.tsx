import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage } from '../companion/types';
import { ChatMessage as MessageBubble } from './ChatMessage';

type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type RecognitionErrorEvent = { error: string };

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type ChatPanelProps = {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (recognizedText?: string) => void;
  voiceEnabled: boolean;
  onVoiceEnabledChange: (enabled: boolean) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  voiceError: string | null;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  onVoiceChange: (voiceURI: string) => void;
};

export function ChatPanel({
  messages,
  input,
  onInputChange,
  onSubmit,
  voiceEnabled,
  onVoiceEnabledChange,
  isSpeaking,
  onStopSpeaking,
  voiceError,
  availableVoices,
  selectedVoiceURI,
  onVoiceChange,
}: ChatPanelProps) {
  const threadRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const speechWindow = window as SpeechRecognitionWindow;
  const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

  useEffect(() => {
    const thread = threadRef.current;
    thread?.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    [],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!Recognition) {
      setMicrophoneError('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interim += result[0].transcript;
      }

      setInterimTranscript(interim);
      if (finalTranscript.trim()) {
        setInterimTranscript('');
        onInputChange(finalTranscript.trim());
        onSubmit(finalTranscript.trim());
      }
    };
    recognition.onerror = (event) => {
      setMicrophoneError(
        event.error === 'not-allowed'
          ? 'Microphone access was denied. Allow microphone access in your browser settings.'
          : `Voice input stopped: ${event.error}.`,
      );
      setIsListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setInterimTranscript('');
    };

    try {
      setMicrophoneError(null);
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (error) {
      recognitionRef.current = null;
      setMicrophoneError(
        error instanceof Error ? `Could not start voice input: ${error.message}` : 'Could not start voice input.',
      );
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-thread" ref={threadRef} role="log" aria-live="polite">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {interimTranscript && (
          <div className="voice-transcript" aria-live="polite">
            <span className="message-sender">Listening</span>
            <p>{interimTranscript}</p>
          </div>
        )}
      </div>

      <div className="chat-tools">
        <div className="quick-actions" aria-label="Quick actions">
          {['Sit down', 'Stand up', 'Run', 'Dance'].map((command) => (
            <button key={command} type="button" onClick={() => onSubmit(command)}>
              {command}
            </button>
          ))}
        </div>
        <div className="voice-controls">
          <label className="voice-picker">
            <span>Reply voice</span>
            <select
              aria-label="Reply voice"
              value={selectedVoiceURI}
              onChange={(event) => onVoiceChange(event.target.value)}
              disabled={availableVoices.length === 0}
            >
              <option value="auto">Auto · prefer feminine</option>
              {availableVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={isListening ? 'voice-control active' : 'voice-control'}
            onClick={toggleListening}
            aria-pressed={isListening}
          >
            {isListening ? 'Stop listening' : '🎙 Talk'}
          </button>
          <button
            type="button"
            className={voiceEnabled ? 'voice-control active' : 'voice-control'}
            onClick={() => onVoiceEnabledChange(!voiceEnabled)}
            aria-pressed={voiceEnabled}
          >
            {voiceEnabled ? '🔊 Voice on' : '🔇 Voice off'}
          </button>
          {isSpeaking && (
            <button type="button" className="voice-control" onClick={onStopSpeaking}>
              Stop voice
            </button>
          )}
        </div>
      </div>
      {(microphoneError || voiceError) && (
        <p className="voice-error" role="alert">{microphoneError ?? voiceError}</p>
      )}
      {availableVoices.length === 0 && (
        <p className="voice-note">No system voices are listed yet. Voice options depend on your browser and OS.</p>
      )}

      <form className="chat-compose" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Say or type: sit, stand, run, dance…"
          aria-label="Chat input"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
