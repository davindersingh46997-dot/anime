import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AvatarScene } from './components/AvatarScene';
import { ChatPanel } from './components/ChatPanel';
import { StatusIndicator } from './components/StatusIndicator';
import { parseCompanionCommand } from './companion/commandParser';
import type { ChatMessage, CompanionAction, CompanionEmotion } from './companion/types';
import './App.css';

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome-message',
    sender: 'companion',
    text: 'Hello! I am ready to help. Try “Dance”, “Run”, “Sit down”, or “Stand up.”',
  },
];

const actionStatusMap: Record<CompanionAction, string> = {
  idle: 'Idle',
  wave: 'Waving',
  nod: 'Nodding',
  dance: 'Dancing',
  walk: 'Walking',
  run: 'Running',
  sit: 'Sitting',
  stand: 'Standing',
  'turn-left': 'Turning left',
  'turn-right': 'Turning right',
  'turn-around': 'Turning around',
  look: 'Looking',
  stop: 'Idle',
};

const feminineVoiceNames =
  /\b(female|woman|girl|zira|jenny|aria|ava|emma|hazel|libby|natasha|samantha|karen|moira|tessa|fiona|serena|susan|sara|laura|linda|heera|priya)\b/i;

const getPreferredVoice = (voices: SpeechSynthesisVoice[]) => {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const candidates = englishVoices.length > 0 ? englishVoices : voices;
  return (
    candidates.find((voice) => feminineVoiceNames.test(voice.name)) ??
    candidates.find((voice) => voice.default) ??
    candidates[0]
  );
};

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [action, setAction] = useState<CompanionAction>('idle');
  const [emotion, setEmotion] = useState<CompanionEmotion>('neutral');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [thought, setThought] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('auto');
  const speechTimer = useRef<number | null>(null);
  const speechRequest = useRef(0);

  const status = useMemo(
    () => (isSpeaking ? 'Speaking' : actionStatusMap[action] ?? 'Idle'),
    [action, isSpeaking],
  );
  const handleActionComplete = useCallback(() => setAction('idle'), []);

  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
      if (speechTimer.current !== null) window.clearInterval(speechTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const updateVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
  }, []);

  const handleSend = (submittedText?: string) => {
    const trimmed = (submittedText ?? input).trim();
    if (!trimmed) return;

    const parsed = parseCompanionCommand(trimmed);
    const companionId = `companion-${Date.now() + 1}`;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };

    const companionMessage: ChatMessage = {
      id: companionId,
      sender: 'companion',
      text: parsed.reply,
    };

    setMessages((previous) => [...previous, userMessage, companionMessage]);
    setAction(parsed.action);
    setEmotion(parsed.emotion);
    setVoiceError(null);
    setInput('');

    speechRequest.current += 1;
    const currentRequest = speechRequest.current;
    if (speechTimer.current !== null) window.clearInterval(speechTimer.current);
    window.speechSynthesis?.cancel();
    if (!voiceEnabled) {
      setIsSpeaking(false);
      setThought(null);
      return;
    }

    if (!('speechSynthesis' in window)) {
      setVoiceError('Spoken replies are not supported in this browser.');
      setIsSpeaking(false);
      setThought(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(parsed.reply);
    const selectedVoice =
      selectedVoiceURI === 'auto'
        ? getPreferredVoice(availableVoices)
        : availableVoices.find((voice) => voice.voiceURI === selectedVoiceURI);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.pitch = 1.08;
    utterance.rate = 0.98;
    let spokenLength = 0;
    const estimatedDuration = Math.max(1200, (parsed.reply.split(/\s+/).length / 2.6) * 1000);
    setThought('Thinking…');
    setIsSpeaking(false);
    utterance.onstart = () => {
      if (currentRequest !== speechRequest.current) return;
      const startedAt = Date.now();
      setThought('');
      setIsSpeaking(true);
      speechTimer.current = window.setInterval(() => {
        const estimatedLength = Math.floor(
          Math.min(1, (Date.now() - startedAt) / estimatedDuration) * parsed.reply.length,
        );
        if (estimatedLength > spokenLength) {
          spokenLength = estimatedLength;
          setThought(parsed.reply.slice(0, spokenLength).trimEnd());
        }
      }, 90);
    };
    utterance.onboundary = (event) => {
      if (currentRequest !== speechRequest.current) return;
      const end = Math.min(parsed.reply.length, event.charIndex + Math.max(event.charLength, 1));
      spokenLength = Math.max(spokenLength, end);
      setThought(parsed.reply.slice(0, spokenLength).trimEnd());
    };
    utterance.onend = () => {
      if (currentRequest !== speechRequest.current) return;
      if (speechTimer.current !== null) window.clearInterval(speechTimer.current);
      speechTimer.current = null;
      setThought(parsed.reply);
      setIsSpeaking(false);
      window.setTimeout(() => setThought((current) => (current === parsed.reply ? null : current)), 2200);
    };
    utterance.onerror = () => {
      if (currentRequest !== speechRequest.current) return;
      if (speechTimer.current !== null) window.clearInterval(speechTimer.current);
      speechTimer.current = null;
      setIsSpeaking(false);
      setThought(null);
      setVoiceError('The spoken reply could not be played. Check your browser audio settings.');
    };
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      if (speechTimer.current !== null) window.clearInterval(speechTimer.current);
      speechTimer.current = null;
      setIsSpeaking(false);
      setThought(null);
      setVoiceError(
        error instanceof Error ? `Could not play the spoken reply: ${error.message}` : 'Could not play the spoken reply.',
      );
    }
  };

  const stopSpeaking = () => {
    speechRequest.current += 1;
    window.speechSynthesis?.cancel();
    if (speechTimer.current !== null) window.clearInterval(speechTimer.current);
    speechTimer.current = null;
    setIsSpeaking(false);
    setThought(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">A</div>
          <div>
            <p className="eyebrow">Companion</p>
            <h1>Anime Companion</h1>
          </div>
        </div>

        <button type="button" className="new-chat-button">
          + New chat
        </button>

        <div className="sidebar-section">
          <p className="section-label">Session</p>
          <ul className="history-list">
            <li className="history-item active">Current session</li>
            <li className="history-item">Wave demo</li>
            <li className="history-item">Dance routine</li>
          </ul>
        </div>

        <div className="sidebar-section">
          <p className="section-label">Status</p>
          <div className="character-status-card">
            <span className="status-light" />
            <span>Ready for commands</span>
          </div>
        </div>
      </aside>

      <main className="main-pane">
        <header className="viewport-header">
          <div>
            <p className="eyebrow">Live scene</p>
            <h2>3D Character</h2>
          </div>
          <StatusIndicator status={status} />
        </header>

        <section className="viewport-panel">
          <AvatarScene
            action={action}
            emotion={emotion}
            onActionComplete={handleActionComplete}
            thought={thought}
            isSpeaking={isSpeaking}
          />
        </section>

        <section className="chat-panel-wrapper">
          <ChatPanel
            messages={messages}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSend}
            voiceEnabled={voiceEnabled}
            onVoiceEnabledChange={(enabled) => {
              setVoiceEnabled(enabled);
              if (!enabled) stopSpeaking();
            }}
            isSpeaking={isSpeaking}
            onStopSpeaking={stopSpeaking}
            voiceError={voiceError}
            availableVoices={availableVoices}
            selectedVoiceURI={selectedVoiceURI}
            onVoiceChange={setSelectedVoiceURI}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
