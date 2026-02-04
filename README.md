# StoryGraph

**Visual narrative editor for interactive fiction writers.**

A Windows-first, node-based story design tool with Git-friendly file formats and multi-platform exports.

---

## Vision

StoryGraph bridges the gap between professional narrative design tools (articy:draft, $400+) and beginner-friendly but limited tools (Twine, Ink). It's built for **writers first**, not game developers.

### Target Audience

- **Interactive fiction authors** - Writers creating choice-based narratives, visual novels, and branching stories
- **Game writers** - Narrative designers who need to prototype and export to game engines
- **Educators** - Teachers using interactive fiction for creative writing and digital literacy
- **Hobbyists** - Anyone who wants to tell non-linear stories

### Why StoryGraph?

| Pain Point | Current Tools | StoryGraph Solution |
|------------|---------------|---------------------|
| **Version control** | Twine uses binary/HTML blobs, hard to diff | YAML-based `.story` format, fully Git-friendly |
| **Collaboration** | Most tools are single-user | Text files that merge cleanly, conflict markers work |
| **Export lock-in** | Each tool exports to its own format | Export to Twine, Ink, Ren'Py, HTML, EPUB |
| **Cost** | articy:draft is $400+, Visual Novel Maker is $60 | Free and open-source |
| **Learning curve** | Ren'Py requires Python, Ink has custom syntax | Visual node editor, write prose directly |
| **Accessibility** | Twine has poor screen reader support | Built-in accessibility from day one |

---

## Research Summary

### Competitive Landscape (2025-2026)

**Professional Tools:**
- [articy:draft X](https://www.articy.com/) - Industry standard (Disco Elysium, Hogwarts Legacy), $400+, Windows-only, steep learning curve
- [Arcweave](https://arcweave.com/) - Browser-based, real-time collaboration, freemium, limited export options

**Free/Open-Source:**
- [Twine](https://twinery.org/) - Most popular, HTML export only, poor version control, save system issues
- [Ink](https://www.inklestudios.com/ink/) - Powerful scripting, but text-only editor (Inky), requires learning custom syntax
- [Ren'Py](https://www.renpy.org/) - Visual novel focused, requires Python knowledge, "not-quite-Python" frustrations
- [StoryFlow Editor](https://storyflow-editor.com/) - Node-based, Git-friendly, but early-stage

**Key Gaps Identified:**
1. No free tool combines visual editing + Git-friendly format + multi-export
2. Writer-focused UX is rare (most tools target game developers)
3. Collaboration features require expensive tools or cloud lock-in
4. Accessibility is an afterthought in most tools

### Market Context

- Interactive fiction on itch.io: **32,525+ games** (2025)
- Mental health apps market: Growing from $7.23B to $36.4B by 2034
- Simulation/narrative games: $3.5B (2024) to $26.2B by 2031
- Mobile gaming: 50% of global gaming revenue

---

## Architecture Overview

### Core Principles

1. **Deterministic** - Same input always produces same output
2. **Offline-first** - No cloud dependency, all data is local
3. **Git-native** - File format designed for version control
4. **Exportable** - Not another walled garden

### File Format: `.story`

Human-readable YAML with clear semantics:

```yaml
# story.yaml
version: "1.0"
meta:
  title: "The Last Door"
  author: "Jane Writer"
  created: 2026-02-02

nodes:
  start:
    type: passage
    content: |
      You stand before an ancient door.
      Moonlight filters through cracked windows.
    choices:
      - text: "Open the door"
        target: open_door
      - text: "Turn back"
        target: turn_back

  open_door:
    type: passage
    content: "The door creaks open..."
```

### Node Types

| Type | Purpose |
|------|---------|
| `passage` | Text content with optional choices |
| `choice` | Branch point with multiple options |
| `condition` | Logic gate (if/else based on variables) |
| `variable` | Set or modify story state |
| `include` | Reference another story file |
| `comment` | Author notes (not exported) |

### Export Targets

- **HTML** - Standalone playable story
- **Twine** - Import into Twine ecosystem
- **Ink** - For Unity/Unreal integration
- **Ren'Py** - Visual novel format
- **EPUB** - E-book with choice navigation
- **JSON** - Raw data for custom integrations

---

## Development Phases

### Phase 1: Deterministic Core (Current)
*10 commits focused on the data model and file format*

- [ ] Story data model (TypeScript interfaces)
- [ ] Node type definitions with validation
- [ ] Edge/connection model
- [ ] YAML serializer/parser
- [ ] Story validation (cycles, dead ends, unreachable nodes)
- [ ] CLI for validation and basic operations

### Phase 2: Visual Editor Foundation
*Desktop app with node canvas*

- [ ] Electron/Tauri app shell
- [ ] Canvas rendering with React Flow or similar
- [ ] Node CRUD operations
- [ ] Edge drawing and management
- [ ] Pan/zoom/minimap

### Phase 3: Writer Experience
*Making it delightful for writers*

- [ ] Rich text editing in nodes
- [ ] Preview pane (play through story)
- [ ] Find/replace across nodes
- [ ] Word count and statistics
- [ ] Keyboard shortcuts

### Phase 4: Export Pipeline
*Getting stories out*

- [ ] HTML exporter with themes
- [ ] Twine format exporter
- [ ] Ink script exporter
- [ ] Ren'Py script exporter

### Phase 5: Collaboration & Polish
*Ready for real users*

- [ ] Git integration UI
- [ ] Diff visualization
- [ ] Theme system
- [ ] Accessibility audit
- [ ] Documentation site

---

## Tech Stack

- **Runtime:** Node.js 22+
- **Language:** TypeScript 5+
- **Desktop:** Tauri 2.0 (Rust backend, web frontend)
- **UI Framework:** React 19 with Tailwind CSS
- **Canvas:** React Flow or Xyflow
- **File Format:** YAML (via js-yaml)
- **Testing:** Vitest
- **Build:** Vite

---

## Getting Started

```bash
# Clone the repository (workspace layout)
git clone https://github.com/mcp-tool-shop-org/story-graph.git
cd story-graph

# Install dependencies
npm install

# Run tests
npm test

# Build core and CLI
npm run build

# Launch web app (Next.js)
npm run dev:web

# Validate a story file
npm exec -w storygraph-cli storygraph validate examples/demo.story
```

---

## Contributing

StoryGraph is open source under the MIT license. Contributions welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

Inspired by the incredible work of:
- [Twine](https://twinery.org/) - Pioneering accessible interactive fiction
- [Ink](https://www.inklestudios.com/ink/) - Elegant narrative scripting
- [articy:draft](https://www.articy.com/) - Professional narrative design
- [Upwelling](https://www.inkandswitch.com/upwelling/) - Version control for writers research
