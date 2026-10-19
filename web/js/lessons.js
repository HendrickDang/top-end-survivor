// Safety content. Every mini-game links to one lesson, and every lesson to an official source.
// Teammates can edit wording here without touching game code.
// Keep tips short (they show for ~2 seconds between rounds).

export const SOURCES = {
  crocwise: {
    title: 'Be Crocwise',
    org: 'NT Government',
    url: 'https://nt.gov.au/emergency/community-safety/crocodile-safety-be-crocwise/how-to-stay-safe',
    summary: 'Only swim in signed swimming areas. Stand at least 5 m back from the water when fishing. Camp at least 50 m from the water\'s edge. Never stand on logs over the water.'
  },
  stingers: {
    title: 'Box jellyfish (stingers)',
    org: 'NT Health',
    url: 'https://health.nt.gov.au/media/pdf/phu/cdc-factsheets/box-jellyfish-nt-health-factsheet.pdf',
    summary: 'Stinger season is roughly 1 October to 31 May. Best advice is to stay out of the sea; if you go in, wear a stinger suit. If stung: call 000 and pour vinegar on the sting. Do not use fresh water. CPR may be needed.'
  },
  cyclone: {
    title: 'Cyclone ready',
    org: 'SecureNT',
    url: 'https://securent.nt.gov.au/prepare-for-an-emergency/cyclones',
    summary: 'Cyclone season runs November to April. Have an emergency plan and kit: at least 3 L of water per person per day for 72 hours, torch, battery radio, spare batteries, first aid kit and medicines.'
  },
  flood: {
    title: 'If it\'s flooded, forget it',
    org: 'NT Police, Fire and Emergency Services',
    url: 'https://pfes.nt.gov.au/newsroom/2018/flooded-road-rescue-old-bynoe-road',
    summary: 'Never drive into floodwater. You cannot see damage to the road, debris or currents underneath, and Top End floodwater can hold crocodiles. Turn around and check roadreport.nt.gov.au.'
  },
  heat: {
    title: 'Heat stress',
    org: 'NT Government',
    url: 'https://nt.gov.au/wellbeing/health-conditions-treatments/heat-stress',
    summary: 'Drink 2 to 3 L of water a day even if you are not thirsty. Avoid alcohol and sugary or hot drinks, rest in shade or air-conditioning, and know the signs: headache, dizziness, cramps, confusion.'
  },
  snake: {
    title: 'Snake bite first aid',
    org: 'Australian Venom Research Unit, University of Melbourne',
    url: 'https://biomedicalsciences.unimelb.edu.au/departments/pharmacology/engage/avru/discover/first-aid/pressure-immobilisation-first-aid',
    summary: 'Call 000. Keep the person still and calm. Apply a firm pressure immobilisation bandage over the bite and up the whole limb, then splint it. Do not wash, cut or suck the bite, and do not use a tourniquet.'
  },
  roads: {
    title: 'Dust storms and outback roads',
    org: 'RACV',
    url: 'https://www.racv.com.au/about-racv/newsroom/dust-storm-driving-tips.html',
    summary: 'Check roadreport.nt.gov.au before you travel and drive to the conditions. Caught in a dust storm? Slow down, turn on your headlights and hazard lights, pull over as soon as it is safe, and wait in the car until it passes.'
  },
  lightning: {
    title: 'Storms and lightning',
    org: 'Swimming NT lightning policy',
    url: 'https://nt.swimming.org.au/sites/default/files/assets/documents/SNT%20Lightning%20Policy%20-%20SNT-POL-007.pdf',
    summary: 'When a storm with lightning is close, leave the water immediately and shelter indoors. Wait at least 30 minutes after the last thunder or lightning before going back in.'
  },
  mozzies: {
    title: 'Mozzies at dusk',
    org: 'NT Health',
    url: 'https://health.nt.gov.au/news/2023/murray-valley-encephalitis-public-health-alert2',
    summary: 'Mosquitoes in the NT can spread serious diseases such as Murray Valley encephalitis. They are most active from sundown to early morning: avoid being outside at dusk and dawn, wear light-coloured long sleeves and trousers, and use a repellent with DEET or picaridin.'
  },
  sun: {
    title: 'Slip, slop, slap, seek, slide',
    org: 'Cancer Council',
    url: 'https://www.cancercouncil.com.au/cancer-prevention/sun-protection/preventing-skin-cancer/slip-slop-slap-seek-slide/',
    summary: 'Slip on clothing that covers your shoulders, arms and legs. Slop on SPF50+ sunscreen. Slap on a hat. Seek shade. Slide on sunglasses.'
  },
  bushfire: {
    title: 'Bushfire survival plan',
    org: 'NT Police, Fire and Emergency Services',
    url: 'https://pfes.nt.gov.au/file/download/36012',
    summary: 'Leaving early is the safest choice. Decide your trigger to leave (for example, smoke in your area) before a fire starts, and have a backup plan.'
  }
};

// Short names for charts (booth screen).
export const GAME_LABELS = {
  'croc-edge': 'Fishing too close to the edge',
  'swim-sign': 'Swimming without a sign',
  'croc-camp': 'Camping near the water',
  'stinger-vinegar': 'Treating a stinger sting',
  'stinger-suit': 'Swimming in stinger season',
  'cyclone-kit': 'Packing a cyclone kit',
  'flood-road': 'Driving into floodwater',
  'heat-drink': 'Staying hydrated in heat',
  'snake-bite': 'Snake bite first aid',
  'bushfire-leave': 'Leaving early in a bushfire',
  'lightning-pool': 'Getting out of the pool in a storm',
  'mozzie-dusk': 'Mozzie protection at dusk',
  'sun-slip': 'Slip, slop, slap',
  'boss-cyclone': 'BOSS: Cyclone Night',
  'boss-croc': 'BOSS: Croc Creek',
  'croc-trap': 'Leaving croc traps to rangers',
  'rock-hole': 'Swimming in a rock hole',
  'dust-storm': 'Driving into a dust storm',
  'flash-flood': 'Crossing a dry river bed'
};

// One emoji per game, used for the Daily Challenge share text.
export const GAME_ICONS = {
  'croc-edge': '🐊', 'swim-sign': '🐊', 'croc-camp': '⛺', 'stinger-vinegar': '🪼', 'stinger-suit': '🪼',
  'cyclone-kit': '🌀', 'flood-road': '🚙', 'heat-drink': '💧', 'snake-bite': '🐍', 'bushfire-leave': '🔥',
  'lightning-pool': '⛈️', 'mozzie-dusk': '🦟', 'sun-slip': '😎', 'boss-cyclone': '👑', 'boss-croc': '👑',
  'croc-trap': '🪤', 'rock-hole': '🏞️', 'dust-storm': '🌪️', 'flash-flood': '🌊'
};

// One entry per mini-game id (see games.js).
export const LESSONS = {
  'croc-edge':   { source: 'crocwise', win: 'Nice! Stand at least 5 m back from the water when fishing.', fail: 'Snapped! Crocs lunge from the edge. Stand 5 m back when fishing.' },
  'swim-sign':   { source: 'crocwise', win: 'Only swim where a sign says it is a swimming area.',            fail: 'No swimming sign means not safe. Any Top End water can hold crocs.' },
  'croc-camp':   { source: 'crocwise', win: 'Camp at least 50 m from the water\'s edge.',                    fail: 'Too close! Camp at least 50 m from the water\'s edge.' },
  'stinger-vinegar': { source: 'stingers', win: 'Vinegar on the sting, then call 000.',                     fail: 'Never fresh water or soft drink. Vinegar on the sting and call 000.' },
  'stinger-suit':    { source: 'stingers', win: 'Stinger season (Oct to May): stinger suit or stay out.',    fail: 'Stingers are nearly invisible. Wear a stinger suit or stay out of the sea.' },
  'cyclone-kit': { source: 'cyclone',  win: 'Water, torch, radio, batteries, first aid. Kit sorted!',       fail: 'A TV won\'t save you. Pack water, torch, battery radio and first aid.' },
  'flood-road':  { source: 'flood',    win: 'If it\'s flooded, forget it. Turn around.',                    fail: 'Washed away! If it\'s flooded, forget it.' },
  'heat-drink':  { source: 'heat',     win: 'Water, often, even before you feel thirsty.',                   fail: 'Cooked! Drink 2 to 3 L of water a day and skip sugary drinks.' },
  'snake-bite':  { source: 'snake',    win: 'Firm bandage up the whole limb, keep still, call 000.',         fail: 'No cutting, sucking or tourniquets. Bandage the whole limb and call 000.' },
  'bushfire-leave': { source: 'bushfire', win: 'Leaving early is the safest choice.',                       fail: 'Don\'t wait for flames. Leaving early is the safest choice.' },
  'lightning-pool': { source: 'lightning', win: 'Storm close? Everyone out of the water and indoors.',                fail: 'Frazzled! Leave the water as soon as a storm is close, and wait 30 minutes after the last thunder.' },
  'mozzie-dusk':    { source: 'mozzies',   win: 'Repellent plus long, light sleeves at dusk and dawn.',                 fail: 'Eaten alive! Mozzies love dusk: use repellent and cover up.' },
  'sun-slip':       { source: 'sun',       win: 'Slip, slop, slap. Sun sorted!',                                        fail: 'Lobster mode! Slip on a shirt, slop on SPF50+ and slap on a hat.' },
  'boss-cyclone':   { source: 'cyclone',   win: 'Cyclone Night survived! Strongest room, away from windows, stay in during the eye.', fail: 'Shelter in the strongest room, away from windows, and stay inside when the eye goes over.' },
  'boss-croc':      { source: 'crocwise',  win: 'Croc Creek survived! You are properly Crocwise.',                       fail: 'Stay out of unsigned water, stand 5 m back, and never go in after a lure.' },
  'croc-trap':   { source: 'crocwise', win: 'Nice timing! Leave it to the rangers: report croc sightings and never touch a croc trap.', fail: 'Missed it! Where a croc has been seen, stay out of the water and stand well back from the edge.' },
  'rock-hole':   { source: 'crocwise', win: 'Everyone out! Crocs can move into waterholes after the wet.',   fail: 'Too slow! Only swim where a sign says it is a swimming area: crocs can turn up in any Top End waterhole.' },
  'dust-storm':  { source: 'roads',    win: 'Pulled over, lights on. Wait out a dust storm in the car.',      fail: 'Never drive blind into dust. Slow down, lights and hazards on, pull over and wait.' },
  'flash-flood': { source: 'flood',    win: 'Back on the bank. A dry river bed can flood in minutes.',          fail: 'Swept away! Never camp in a dry river bed. Floodwater can arrive with little warning.' }
};
