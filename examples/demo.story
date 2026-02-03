# StoryGraph Story File
# Title: The Last Door
# Generated: 2026-02-02T00:00:00.000Z
# Format: https://github.com/mcp-tool-shop-org/storygraph

version: "1.0"

meta:
  title: "The Last Door"
  author: "StoryGraph Team"
  description: "A short demonstration of StoryGraph's capabilities"
  created: "2026-02-02T00:00:00.000Z"
  rating: everyone
  language: en
  tags:
    - demo
    - tutorial
    - mystery

variables:
  has_key: false
  courage: 0

nodes:
  start:
    type: passage
    start: true
    content: |
      You stand before an ancient door, its surface carved with symbols
      that seem to shift in the flickering torchlight. The air is thick
      with dust and the weight of centuries.

      Behind you, the corridor stretches back into darkness. The only
      way forward is through this door.
    choices:
      - text: "Examine the carvings more closely"
        target: examine_door
      - text: "Try to push the door open"
        target: push_door
      - text: "Search the area for clues"
        target: search_area

  examine_door:
    type: passage
    content: |
      You lean in close, tracing the symbols with your fingertips. They
      tell a story - of guardians who sealed something away, long ago.

      At the center of the door, you notice a small keyhole, barely
      visible among the decorative patterns.
    choices:
      - text: "Try the door handle"
        target: push_door
      - text: "Search for a key"
        target: search_area
      - text: "Return to studying the door"
        target: start

  push_door:
    type: condition
    expression: "has_key"
    notes: "Check if the player found the key"
    ifTrue: door_opens
    ifFalse: door_locked

  door_locked:
    type: passage
    content: |
      You push against the door, but it doesn't budge. The ancient
      mechanism holds fast, waiting for its proper key.

      A cold draft whispers through the cracks, as if mocking your
      attempt.
    choices:
      - text: "Search the area"
        target: search_area
      - text: "Examine the door again"
        target: examine_door

  search_area:
    type: passage
    content: |
      You search the dusty floor, running your hands along the cold
      stone walls. In a small alcove hidden behind a loose brick,
      your fingers close around something metallic.

      A key! Ornate and old, but it might just fit that lock.
    choices:
      - text: "Take the key and try the door"
        target: get_key

  get_key:
    type: variable
    set:
      has_key: true
    increment:
      courage: 1
    next: try_door_with_key

  try_door_with_key:
    type: passage
    content: |
      With trembling hands, you insert the key into the lock. It fits
      perfectly, as if it had been waiting for this moment.

      You feel a moment of hesitation. What lies beyond?
    choices:
      - text: "Turn the key"
        target: push_door
      - text: "Wait... I need to think about this"
        target: hesitate

  hesitate:
    type: passage
    content: |
      You pause, key in hand. Some doors, once opened, can never be
      closed again.

      But you've come this far. The darkness behind you offers no
      answers.
    choices:
      - text: "Turn the key"
        target: push_door
      - text: "Remove the key and leave"
        target: leave_ending

  door_opens:
    type: passage
    content: |
      The key turns with a satisfying click. Ancient mechanisms grind
      into motion, and slowly, the door swings inward.

      Beyond lies... light. Warm, golden light spilling from a garden
      you never expected to find beneath the earth.

      You step through the threshold into a new world.
    choices:
      - text: "Enter the garden"
        target: garden_ending

  garden_ending:
    type: passage
    ending: true
    content: |
      The garden stretches before you, impossibly vast and beautiful.
      Flowers of colors you've never seen sway in a breeze that
      carries the scent of spring.

      In the center stands an ancient tree, its branches heavy with
      golden fruit.

      You've found it. The last door led not to darkness, but to
      wonder.

      THE END

  leave_ending:
    type: passage
    ending: true
    content: |
      You remove the key and step back. Some mysteries are better left
      unsolved. Some doors, unopened.

      You turn and walk back down the corridor, leaving the ancient
      door and its secrets behind.

      Perhaps another day. Perhaps another lifetime.

      THE END

  author_notes:
    type: comment
    content: |
      This demo story showcases:
      - Passage nodes with choices
      - Condition nodes for branching
      - Variable nodes for state management
      - Multiple endings
      - Proper start/ending markers

      Feel free to modify and experiment!
