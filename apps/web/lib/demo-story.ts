/**
 * Built-in demo story showcasing StoryGraph features.
 * Instantly playable without API - perfect for first-time users.
 */
export const DEMO_STORY_YAML = `version: "1.0"
meta:
  title: "The Enchanted Forest"
  author: "StoryGraph Demo"

variables:
  courage: 0
  wisdom: 0
  hasMap: false
  metFairy: false

nodes:
  start:
    type: passage
    start: true
    content: |
      You stand at the edge of an ancient forest. Towering oaks
      whisper secrets in the wind, and a mysterious path leads
      deeper into the shadows.

      A weathered signpost reads: "Beware - not all who enter return."

      What will you do?
    choices:
      - text: "Step boldly into the forest"
        target: brave_entry
        effects:
          courage: 1
      - text: "Look around for another path"
        target: search_area
        effects:
          wisdom: 1
      - text: "Turn back - this seems too dangerous"
        target: retreat

  brave_entry:
    type: passage
    content: |
      You stride forward with determination. The trees seem to
      part slightly, as if acknowledging your courage.

      After a few minutes, you reach a fork in the path.
    choices:
      - text: "Take the sunlit path to the right"
        target: sunlit_path
      - text: "Follow the mysterious mist to the left"
        target: misty_path

  search_area:
    type: passage
    content: |
      Your careful observation pays off! Behind a large rock,
      you discover an old leather map case.

      Inside is a faded map of the forest, showing hidden
      paths and dangerous areas marked with skull symbols.
    effects:
      hasMap: true
      wisdom: 1
    choices:
      - text: "Enter the forest with your new knowledge"
        target: brave_entry

  retreat:
    type: passage
    content: |
      Sometimes wisdom is knowing when not to act. You turn
      back toward the village.

      But as you walk away, a small voice calls out: "Wait!
      Don't leave yet!"

      A tiny glowing figure emerges from the underbrush.
    choices:
      - text: "Stop and listen"
        target: meet_fairy
      - text: "Keep walking - it might be a trick"
        target: missed_opportunity

  meet_fairy:
    type: passage
    content: |
      The glowing figure is a forest fairy, no bigger than
      your hand.

      "I am Luminara," she says. "The forest needs help!
      An ancient evil stirs in the Crystal Cave. Will you
      help us?"
    effects:
      metFairy: true
    choices:
      - text: "I'll help you, Luminara!"
        target: fairy_blessing
        effects:
          courage: 1
      - text: "I need to know more first"
        target: fairy_info
        effects:
          wisdom: 1

  fairy_blessing:
    type: passage
    content: |
      Luminara's light brightens with joy. "Thank you, brave one!"

      She touches your forehead, and warmth spreads through you.

      "I've given you the Forest's Blessing. You will be able to
      see paths hidden to others. Now, enter the forest!"
    choices:
      - text: "Enter the enchanted forest"
        target: brave_entry

  fairy_info:
    type: passage
    content: |
      Luminara nods approvingly. "Wisdom is valuable here."

      She explains that a shadow creature has taken residence
      in the Crystal Cave, corrupting the forest's magic.

      "But be warned - it can only be defeated with both
      courage AND wisdom. You'll need both to succeed."
    choices:
      - text: "I understand. I'll help you."
        target: fairy_blessing
      - text: "This sounds too dangerous for me."
        target: final_retreat

  missed_opportunity:
    type: passage
    content: |
      You hurry away, ignoring the voice. The forest grows
      silent behind you.

      Years later, you hear tales of an enchanted forest
      that vanished, consumed by shadow. You sometimes
      wonder what might have been different...
    ending: true

  sunlit_path:
    type: passage
    content: |
      The sunlit path leads to a peaceful glade where an
      old hermit sits beside a bubbling spring.

      "Ah, a traveler," he says. "I am the Keeper of Riddles.
      Answer correctly, and I'll share a secret."

      He asks: "What grows stronger the more you give it away?"
    choices:
      - text: "Love"
        target: riddle_correct
      - text: "Money"
        target: riddle_wrong
      - text: "Knowledge"
        target: riddle_close

  riddle_correct:
    type: passage
    content: |
      The hermit smiles warmly. "Yes! Love grows when shared."

      He hands you a glowing crystal. "Take this - it will
      light your way in darkness. The Crystal Cave lies
      at the forest's heart. Good luck, wise one."
    effects:
      wisdom: 2
    choices:
      - text: "Thank him and continue toward the cave"
        target: approach_cave

  riddle_wrong:
    type: passage
    content: |
      The hermit shakes his head. "Money diminishes when given.
      Think deeper, traveler."
    choices:
      - text: "Try again: Love"
        target: riddle_correct
      - text: "Leave and find another way"
        target: misty_path

  riddle_close:
    type: passage
    content: |
      The hermit tilts his head. "Knowledge does grow when shared,
      but there's an even better answer. Try once more."
    effects:
      wisdom: 1
    choices:
      - text: "Love?"
        target: riddle_correct
      - text: "I'll find my own way"
        target: misty_path

  misty_path:
    type: passage
    content: |
      The mist swirls around you, disorienting at first.
      But then you notice something - the mist parts slightly
      ahead, revealing the path forward.
    conditions:
      - if: "hasMap"
        then: map_advantage
    choices:
      - text: "Follow where the mist leads"
        target: approach_cave

  map_advantage:
    type: passage
    content: |
      Your map shows this misty area clearly! You navigate
      confidently through shortcuts that would take others
      hours to discover.

      Soon, you emerge at the entrance to the Crystal Cave,
      well-prepared and with energy to spare.
    effects:
      wisdom: 1
    choices:
      - text: "Enter the Crystal Cave"
        target: approach_cave

  approach_cave:
    type: passage
    content: |
      The Crystal Cave looms before you, its entrance
      glittering with thousands of tiny crystals.

      From within, you sense a dark presence watching...
    conditions:
      - if: "courage >= 2 && wisdom >= 2"
        then: final_battle_ready
      - if: "courage >= 2 || wisdom >= 2"
        then: final_battle_partial
    choices:
      - text: "Enter and face whatever awaits"
        target: final_battle_unprepared

  final_battle_ready:
    type: passage
    content: |
      As you enter, your combined courage and wisdom create
      a brilliant aura around you. The shadow creature
      shrinks back in surprise!

      "Impossible!" it hisses. "No mortal should possess both
      the heart of a lion and the mind of a sage!"

      With a flash of light, the creature dissolves, and the
      forest's magic is restored.

      Luminara appears, tears of joy in her eyes. "You did it!
      The forest will remember you forever."
    ending: true

  final_battle_partial:
    type: passage
    content: |
      You enter the cave with determination, but the shadow
      creature is powerful. The battle is hard-fought.

      Though you ultimately succeed, the victory comes at a
      cost - some of the forest's magic is lost forever.

      Still, you emerge a hero, changed by your journey.
    ending: true

  final_battle_unprepared:
    type: passage
    content: |
      The shadow creature's power overwhelms you. Just as
      all seems lost, Luminara appears and sacrifices
      herself to save you.

      You escape, but the forest falls silent. The fairy's
      sacrifice weighs heavily on your heart.

      Perhaps with more preparation, things might have
      ended differently...
    ending: true

  final_retreat:
    type: passage
    content: |
      You decide this adventure isn't for you. Some are
      meant to be heroes, others to live quiet lives.

      And there's nothing wrong with that.
    ending: true
`;

export const DEMO_STORY_ID = '__demo__';
