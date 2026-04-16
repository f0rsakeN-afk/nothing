// Time of day categories
const NIGHT = ["night", "owl hours", "witching hour", "midnight", "3am thoughts"];
const MORNING = ["morning", "rise and grind", "fresh start", "sun's up", "coffee time"];
const AFTERNOON = ["afternoon", "power hours", "flow state", "grind time", "keep going"];
const EVENING = ["evening", "golden hour", "wind down", "cozy time", "sundown"];
const LATE_NIGHT = ["late night", "night owl", "after hours", "quiet hours", "moonlight"];

// Days of week
const MONDAY = ["monday", "start of the week", "fresh week", "new week new me"];
const TUESDAY = ["tuesday", "hump day eve", "still going", "tuesday thoughts"];
const WEDNESDAY = ["wednesday", "hump day", "halfway there", "midweek vibes"];
const THURSDAY = ["thursday", "almost friday", "thirsty thursday", "thursday grind"];
const FRIDAY = ["friday", "TGIF", "friyay", "weekend incoming", "last stretch"];
const SATURDAY = ["saturday", "saturdays are for", "chill mode", "weekend vibes"];
const SUNDAY = ["sunday", "sunday scaries", "sunday reset", "prepare for the week"];

// Seasons
const SPRING = ["spring", "new beginnings", "renewal", "bloom", "fresh"];
const SUMMER = ["summer", "sunshine", "outdoor vibes", "beach mode", "vibes"];
const FALL = ["fall", "cozy season", "pumpkin", "sweater weather", "autumn"];
const WINTER = ["winter", "cozy", "hot cocoa", "snow day", "hibernate"];

// Moods / Vibes
const PRODUCTIVE = [
  "Let's get things done.",
  "Productivity mode: ON.",
  "What's the mission?",
  "Time to ship.",
  "Focus mode activated.",
  "Let's crush this.",
  "Work mode engaged.",
  "Make it happen.",
  "Execution time.",
  "Action speaks louder.",
];

const CHILL = [
  "No rush. Let's chill.",
  "Easy does it.",
  "Take your time.",
  "No pressure.",
  "Whatever happens, happens.",
  "Just vibes.",
  "Go with the flow.",
  "Lowkey mode.",
  "No stress.",
  "Relax and code.",
];

const CHAOS = [
  "What did you break?",
  "Debug time. again.",
  "Stack trace says what?",
  "Let's fix this mess.",
  "Chaos engineering.",
  "Emergency mode.",
  "Firefighting engaged.",
  "Save the day.",
  "Crisis averted? Not yet.",
  "Mayhem, let's go.",
];

const EXCITED = [
  "LET'S GOOO!",
  "This is going to be fun.",
  "I'm hyped!",
  "Let's make magic!",
  "Adventure time!",
  "Excited to build this.",
  "Let's do something awesome!",
  "The vibes are immaculate.",
  "Peak excitement.",
  "Can't wait to start!",
];

const LAZY = [
  "Work smarter, not harder.",
  "Why do more when I can do less?",
  "Minimum effort. Maximum results.",
  "Copy-paste is a valid strategy.",
  "Automate everything.",
  "Let me do the heavy lifting.",
  "Procrastinate productively.",
  "The lazy approach.",
  "Work smarter.",
  "What's the lazy way?",
];

const LEARNER = [
  "Teach me something new.",
  "Curious minds welcome.",
  "I want to learn.",
  "Show me something interesting.",
  "What's the explanation?",
  "How does this work?",
  "I'm here to grow.",
  "Knowledge transfer time.",
  "Wise up.",
  "Let's understand this.",
];

const BOLD = [
  "Hit me with the hard stuff.",
  "Challenge accepted.",
  "Let's go big or go home.",
  "No problem is too big.",
  "I was built for this.",
  "Bring it on.",
  "Nothing to fear.",
  "Maximum difficulty. Let's go.",
  "Elite mode.",
  "Ultimate challenge.",
];

const WHIMSICAL = [
  "Wingardium Leviosa your code.",
  "Expelliarmus the bug.",
  " Mischief managed. What next?",
  "魔法 is real.",
  "Let's go on an adventure.",
  "Curiouser and curiouser.",
  "Down the rabbit hole.",
  "Wonderland awaits.",
  "Dream mode: activated.",
  "Fantasy becomes reality.",
];

const REAL_TALK = [
  "Be honest. What do you actually need?",
  "Cut to the chase.",
  "No cap. What's the real task?",
  "Let's be real.",
  "The actual problem is...",
  "No fluff. Just solutions.",
  "What's actually going on?",
  "Truth time.",
  "The real talk.",
  "Get to the point.",
];

const SEASONAL_FALLBACK = [
  // Spring
  "April showers, May code flowers.",
  "Spring cleaning for your codebase.",
  "March madness, April fixes.",
  "Spring into action.",
  "Budding developer energy.",

  // Summer
  "Summer of code.",
  "Beach bod code mode.",
  "Sun's out, code's out.",
  "Vacation coding is valid.",
  "Summer of debugging (sad).",

  // Fall
  "Sweater weather coding.",
  "Fall into better code.",
  "Pumpkin spice and debugging.",
  "Harvest season for bugs.",
  "Crunch time for code.",

  // Winter
  "Jingle bells, code swells.",
  "Winter code mode.",
  "Hot cocoa and debugging.",
  "Snowed in with code.",
  "Holiday code crunch.",
];

// Special dates
const SPECIAL = {
  newYear: ["New year, new me (the code).", "New year, new codebase.", "New year resolution: ship more.", "2024 is OUR year.", "New year, same me but more productive."],
  christmas: ["Ho ho ho. What are we coding?", "Christmas miracle needed.", "All I want for Christmas is clean code.", "Santa checked your git log. Yikes.", "Jingle bells, bugs dwell."],
  halloween: ["Tricks AND treats.", "Spooky season coding.", "What haunted your codebase this time?", "Boo! I saw that bug.", "Trick or code?"],
  friday13th: ["Friday the 13th special.", "Something wicked this way comes.", "Creepy code unlocked.", "Spooky bugs edition.", "It's haunted."],
};

// Get the day category
function getDayCategory(): string {
  const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  switch (day) {
    case 0: return SUNDAY[Math.floor(Math.random() * SUNDAY.length)];
    case 1: return MONDAY[Math.floor(Math.random() * MONDAY.length)];
    case 2: return TUESDAY[Math.floor(Math.random() * TUESDAY.length)];
    case 3: return WEDNESDAY[Math.floor(Math.random() * WEDNESDAY.length)];
    case 4: return THURSDAY[Math.floor(Math.random() * THURSDAY.length)];
    case 5: return FRIDAY[Math.floor(Math.random() * FRIDAY.length)];
    case 6: return SATURDAY[Math.floor(Math.random() * SATURDAY.length)];
    default: return "";
  }
}

// Get season category
function getSeasonCategory(): string {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return SPRING[Math.floor(Math.random() * SPRING.length)];
  if (month >= 5 && month <= 7) return SUMMER[Math.floor(Math.random() * SUMMER.length)];
  if (month >= 8 && month <= 10) return FALL[Math.floor(Math.random() * FALL.length)];
  return WINTER[Math.floor(Math.random() * WINTER.length)];
}

// Get time category
function getTimeCategory(): string {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return NIGHT[Math.floor(Math.random() * NIGHT.length)];
  if (hour >= 5 && hour < 12) return MORNING[Math.floor(Math.random() * MORNING.length)];
  if (hour >= 12 && hour < 17) return AFTERNOON[Math.floor(Math.random() * AFTERNOON.length)];
  if (hour >= 17 && hour < 21) return EVENING[Math.floor(Math.random() * EVENING.length)];
  return LATE_NIGHT[Math.floor(Math.random() * LATE_NIGHT.length)];
}

// Get random mood
function getRandomMood(): string[] {
  const moods = [PRODUCTIVE, CHILL, CHAOS, EXCITED, LAZY, LEARNER, BOLD, WHIMSICAL, REAL_TALK];
  const selected = moods[Math.floor(Math.random() * moods.length)];
  return selected;
}

// Get special date heading
function getSpecialDateHeading(): string | null {
  const now = new Date();
  const month = now.getMonth();
  const date = now.getDate();
  const day = now.getDay();

  // New Year's (Jan 1)
  if (month === 0 && date === 1) {
    return SPECIAL.newYear[Math.floor(Math.random() * SPECIAL.newYear.length)];
  }

  // Christmas (Dec 25)
  if (month === 11 && date === 25) {
    return SPECIAL.christmas[Math.floor(Math.random() * SPECIAL.christmas.length)];
  }

  // Halloween (Oct 31)
  if (month === 9 && date === 31) {
    return SPECIAL.halloween[Math.floor(Math.random() * SPECIAL.halloween.length)];
  }

  // Friday the 13th
  if (day === 5 && date === 13) {
    return SPECIAL.friday13th[Math.floor(Math.random() * SPECIAL.friday13th.length)];
  }

  return null;
}

// Main function
export function getTimeBasedHeading(): string {
  // First check for special dates
  const specialHeading = getSpecialDateHeading();
  if (specialHeading) return specialHeading;

  // 30% chance of pure mood-based
  if (Math.random() < 0.3) {
    const mood = getRandomMood();
    return mood[Math.floor(Math.random() * mood.length)];
  }

  // 40% chance of time + mood combo
  if (Math.random() < 0.4) {
    const time = getTimeCategory();
    const mood = getRandomMood();
    const moodText = mood[Math.floor(Math.random() * mood.length)];
    // Combine them nicely
    return `${time}. ${moodText}`;
  }

  // 30% chance of day-based
  if (Math.random() < 0.3) {
    const day = getDayCategory();
    const mood = getRandomMood();
    const moodText = mood[Math.floor(Math.random() * mood.length)];
    return `${day}. ${moodText}`;
  }

  // Otherwise pure time-based
  return getTimeCategory();
}
