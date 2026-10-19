// Optional Quick Safety Check: 3 questions before the first game and the SAME 3 after it,
// so we can measure what people actually learned. Shared with the server (which validates ids).
// Each question: the correct answer is always options[0]; the game shuffles them on screen.
export const QUESTIONS = [
  { id: 'q-croc-fish', topic: 'crocwise', q: 'Fishing from a Top End riverbank, how far back from the water should you stand?', options: ['At least 5 m', 'At the edge, so you can see', '1 m is enough'] },
  { id: 'q-croc-swim', topic: 'crocwise', q: 'A waterhole looks clear and has no signs. Is it safe to swim?', options: ['No, only swim in signed swimming areas', 'Yes, if you cannot see a croc', 'Yes, during the day'] },
  { id: 'q-stinger', topic: 'stingers', q: 'Someone is stung by a box jellyfish. What do you pour on the sting?', options: ['Vinegar (and call 000)', 'Fresh water', 'Soft drink'] },
  { id: 'q-cyclone-eye', topic: 'cyclone', q: 'During a cyclone it suddenly goes calm. What should you do?', options: ['Stay inside: it may be the eye', 'Go outside, it is over', 'Drive to check on things'] },
  { id: 'q-flood', topic: 'flood', q: 'Water is flowing over a floodway you cross every day. What do you do?', options: ['Turn around: if it is flooded, forget it', 'Drive through slowly', 'Walk across to check the depth'] },
  { id: 'q-heat', topic: 'heat', q: 'On a very hot day, how much water should an adult drink?', options: ['2 to 3 litres, even if not thirsty', 'Only when thirsty', 'A can of soft drink is fine'] },
  { id: 'q-snake', topic: 'snake', q: 'First aid for a snake bite on the leg?', options: ['Firm bandage up the whole leg, keep still, call 000', 'Wash the bite and suck out the venom', 'Tie a tight tourniquet above the bite'] },
  { id: 'q-bushfire', topic: 'bushfire', q: 'What is the safest choice when a bushfire threatens your area?', options: ['Leave early', 'Wait until you see flames', 'Stay and film it'] },
  { id: 'q-lightning', topic: 'lightning', q: 'A storm with lightning is close and you are in the pool. What now?', options: ['Get out and shelter indoors', 'Stay in, water protects you', 'Shelter under a tree'] },
  { id: 'q-mozzie', topic: 'mozzies', q: 'When are NT mosquitoes most active?', options: ['From sundown to early morning', 'Around midday', 'Only in the dry season'] }
];
export const QUESTION_IDS = QUESTIONS.map(q => q.id);
export const QUIZ_LEN = 3;
