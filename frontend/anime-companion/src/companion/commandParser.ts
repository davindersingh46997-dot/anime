import type { CompanionCommand, CompanionEmotion } from './types';
import { COMMAND_RESPONSES, FALLBACK_REPLIES } from './rules';

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[!?.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const pickReply = (key: keyof typeof COMMAND_RESPONSES) => COMMAND_RESPONSES[key];

const determineEmotion = (text: string): CompanionEmotion => {
  if (/(smile|grin|happy|cheerful)/.test(text)) return 'happy';
  if (/(sad|down|unhappy|cry|depressed)/.test(text)) return 'sad';
  if (/(surprised|shock|wow|amazed)/.test(text)) return 'surprised';
  if (/(angry|mad|furious|annoyed)/.test(text)) return 'angry';
  return 'neutral';
};

export function parseCompanionCommand(rawText: string): CompanionCommand {
  const text = normalizeText(rawText);

  if (!text) {
    return {
      reply: 'Please say something so I can respond.',
      action: 'idle',
      emotion: 'neutral',
    };
  }

  let action: CompanionCommand['action'] = 'idle';
  let reply = pickReply('unknown');

  if (/(stop moving|pause|halt|stop now|stop the movement)/.test(text)) {
    action = 'stop';
    reply = pickReply('stop');
  } else if (/(return to idle|go back to idle|be idle|idle pose|neutral pose)/.test(text)) {
    action = 'idle';
    reply = pickReply('idle');
  } else if (/(wave at me|wave|hello there|hello|hi there|hi|hey)/.test(text)) {
    action = 'wave';
    reply = pickReply('hello');
  } else if (/(nod your head|nod)/.test(text)) {
    action = 'nod';
    reply = pickReply('nod');
  } else if (/(dance for me|dance|let s dance|start dancing)/.test(text)) {
    action = 'dance';
    reply = pickReply('dance');
  } else if (/(sit down|take a seat|\bsit\b)/.test(text)) {
    action = 'sit';
    reply = pickReply('sit');
  } else if (/(stand up|stand straight|\bstand\b)/.test(text)) {
    action = 'stand';
    reply = pickReply('stand');
  } else if (/(run forward|\brun\b|jog)/.test(text)) {
    action = 'run';
    reply = pickReply('run');
  } else if (/(walk forward|walk ahead|go forward|walk)/.test(text)) {
    action = 'walk';
    reply = pickReply('walk');
  } else if (/(turn left|left turn)/.test(text)) {
    action = 'turn-left';
    reply = pickReply('turnLeft');
  } else if (/(turn right|right turn)/.test(text)) {
    action = 'turn-right';
    reply = pickReply('turnRight');
  } else if (/(turn around|turn 180|spin around|turn around 180)/.test(text)) {
    action = 'turn-around';
    reply = pickReply('turnAround');
  } else if (/(look at me|look toward the camera|look at the camera|look)/.test(text)) {
    action = 'look';
    reply = pickReply('look');
  }

  const emotion = determineEmotion(text);

  if (emotion === 'happy' && action === 'idle') {
    reply = pickReply('smile');
  } else if (emotion === 'sad' && action === 'idle') {
    reply = pickReply('sad');
  } else if (emotion === 'surprised' && action === 'idle') {
    reply = pickReply('surprised');
  }

  if (!reply || reply === pickReply('unknown')) {
    reply = FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
  }

  return {
    reply,
    action,
    emotion,
  };
}
