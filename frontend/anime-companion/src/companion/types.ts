export type CompanionAction =
  | 'idle'
  | 'wave'
  | 'nod'
  | 'dance'
  | 'walk'
  | 'run'
  | 'sit'
  | 'stand'
  | 'turn-left'
  | 'turn-right'
  | 'turn-around'
  | 'look'
  | 'stop';

export type CompanionEmotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';

export type CompanionCommand = {
  reply: string;
  action: CompanionAction;
  emotion: CompanionEmotion;
};

export type ChatMessage = {
  id: string;
  sender: 'user' | 'companion';
  text: string;
};
