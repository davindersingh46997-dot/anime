import type { ChatMessage as ChatMessageType } from '../companion/types';

type ChatMessageProps = {
  message: ChatMessageType;
};

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`chat-message ${message.sender}`}>
      <span className="message-sender">{message.sender === 'user' ? 'You' : 'Companion'}</span>
      <p>{message.text}</p>
    </div>
  );
}
