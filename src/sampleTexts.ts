export interface Sample {
  id: string;
  title: string;
  description: string;
  text: string;
  recommendedConfig?: string;
}

export const SAMPLE_TEXTS: Sample[] = [
  {
    id: 'story-baseliner',
    title: 'Fiction: Baseliner & Mechanics Box',
    description: 'Contains Baseliner pronouns, system notification box, repetitive action lines, and dialogue.',
    recommendedConfig: 'Story Scene (Lore + 1k Split)',
    text: `The corridor shook violently. Dust poured from the cracked pipes overhead.

Kael-7, a Baseliner scout assigned to our squad, looked back at me. He pointed towards the bulkhead with two fingers then he tapped his throat collar. "Enemy contact in the inner ring," he said through his vox. He then signaled with his left hand again to confirm.

═══════════════════════════════════════════════
[SYSTEM NOTICE: ANOMALY DETECTED]
Sector: Sub-Level 04 - Reactor Array
Integrity: 41%
Mechanics: Phase shift active. Physical armor reduced by 25%.
Roll DC: 14 Fortitude check required upon entry.
═══════════════════════════════════════════════

The heat in the corridor was rising fast. It was getting extremely hot. The temperature was climbing higher every second. The room was just getting hotter and hotter.

"We have to move now before the seals collapse," I shouted to the squad.
"No point waiting around here."
"We'll get burned alive if we stay in this room."

Kael-7 tilted their head sharply to the left and flared their shoulder vents before gesturing toward the ventilation duct. "The shaft is open," they signaled.

I knew he was right. I stepped forward. For a second, everything slowed down. HE realized what had to be done next. HIM against the machine hive.`,
  },
  {
    id: 'epic-speech',
    title: 'Dramatic Speech / Monologue',
    description: 'Anime / high-stakes speech draft that needs escalation, rhythm, and emotional punch.',
    recommendedConfig: 'Speech Enhancement',
    text: `Listen to me, all of you!
They told us our city would fall before sunrise. They said we had no chance against their army. They told us that surrender was the only realistic option left. But they forgot one thing. They forgot that we chose to stand here. We didn't run away yesterday, and we're definitely not running away today!
Every single scar you carry isn't proof of weakness. It's proof that you survived everything they threw at you. So when they march through that shattered gate, don't look down at the dirt. Look them right in the eyes. Show them what happens when people refuse to break! If this is our final stand, let's make it an echo that shakes the entire continent!`,
  },
  {
    id: 'academic-essay',
    title: 'Academic Reflection / Report',
    description: 'School paper draft with informal phrasing needing clarity and academic tone while preserving voice.',
    recommendedConfig: 'Academic Cleanup',
    text: `In this paper I'm basically going to discuss how renewable energy grids handle power storage problems. A lot of people think that just building more solar panels solves everything, but that's really not how it works in real life. If the sun isn't shining or the wind stops blowing, you get massive dips in the grid. In my opinion, battery storage tech is way more important than just putting up extra wind turbines. Recent case studies from 2024 show that without decentralized battery backups, up to thirty percent of generated power just gets wasted completely. So my conclusion is that funding needs to shift toward storage tech first and foremost.`,
  },
];
