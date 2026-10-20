export const UNKNOWN_COMMAND_REPLY =
  'I am ready to help. Try “Hello”, “Dance”, “Walk forward”, or “Stop moving.”';

export const FALLBACK_REPLIES = [
  'I am here and ready to help.',
  'Let me know what you want me to do next.',
  'I can wave, dance, walk, run, sit, stand, or turn on command.',
  'I am listening. Tell me to do a movement or expression.',
];

export const COMMAND_RESPONSES = {
  hello: 'Hello! Nice to see you. Wave incoming!',
  wave: 'Hello! I am waving at you.',
  nod: 'Of course. I will nod politely.',
  dance: 'Absolutely! I am starting a little dance.',
  walk: 'I will walk forward a few steps.',
  run: 'I will run forward!',
  sit: 'I will sit down and relax.',
  stand: 'I am standing up straight.',
  turnLeft: 'Turning left now.',
  turnRight: 'Turning right now.',
  turnAround: 'Turning around for you.',
  look: 'I am looking right at you.',
  smile: 'Smile time! I am feeling cheerful.',
  sad: 'I am trying a softer, more thoughtful expression.',
  surprised: 'Wow! I am showing a surprised expression.',
  stop: 'Understood. I am pausing the current action.',
  idle: 'Back to my neutral pose.',
  unknown: UNKNOWN_COMMAND_REPLY,
};
