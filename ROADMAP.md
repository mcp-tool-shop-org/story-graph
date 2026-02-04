# StoryGraph Roadmap

> **Vision**: The free, Git-native visual narrative editor for interactive fiction writers.
>
> Bridge the gap between $400+ tools (articy:draft) and limited beginner tools.
> YAML-based `.story` files that merge cleanly in Git, export anywhere.

---

## Current State (February 2026)

**What Works:**

- Core runtime engine (deterministic, tested, production-ready)
- YAML story format (parseable, serializable, Git-friendly)
- Full validation (dead ends, unreachable nodes, cycles)
- CLI tool (validate, create, stats, export, graph)
- Web app with story management, YAML editor, basic play mode
- SQLite database with version history
- Demo story ("The Enchanted Forest")

**What's Broken/Missing:**

- Can't visually edit nodes (YAML-only)
- Export only produces JSON/HTML outlines (no Ink, Ren'Py, EPUB)
- No desktop app (promised Windows-first, but web-only)
- No rich text editing
- No collaboration features

---

## Phase 1: Core Functionality ✅ COMPLETE

- [x] Deterministic runtime with save/load
- [x] YAML parser and serializer
- [x] Expression evaluator (safe, AST-based)
- [x] All node types (passage, choice, condition, variable, include, comment)
- [x] Validation engine
- [x] CLI tool

---

## Phase 2: Web Foundation ✅ MOSTLY COMPLETE

- [x] Story CRUD API
- [x] SQLite persistence with version history
- [x] YAML editor with live validation
- [x] Basic play mode
- [x] Story list with search/sort
- [ ] **FIX: Story creation flow** (button → API → editor)

---

## Phase 3: Visual Node Editor 🎯 NEXT

The killer feature. Writers shouldn't need to touch YAML.

### 3.1 Canvas Foundation

- [ ] Integrate React Flow / Xyflow for node canvas
- [ ] Render story as interactive graph
- [ ] Pan, zoom, minimap
- [ ] Node selection syncs with YAML

### 3.2 Node Editing

- [ ] Create nodes via double-click or palette
- [ ] Edit node content inline (passage text, choices)
- [ ] Delete nodes with confirmation
- [ ] Drag to reposition (persist to YAML)

### 3.3 Edge Management

- [ ] Draw connections between nodes
- [ ] Visualize choice → target relationships
- [ ] Highlight validation errors on edges

### 3.4 Dual-Mode Editing

- [ ] Toggle between Canvas and YAML views
- [ ] Changes sync bidirectionally
- [ ] Split view option

---

## Phase 4: Export Pipeline

Writers need to get stories OUT of the tool.

### 4.1 HTML Player Export

- [ ] Standalone HTML file with embedded runtime
- [ ] Theme support (light/dark, custom CSS)
- [ ] Playable offline

### 4.2 Ink Export

- [ ] Convert StoryGraph → Inkle's Ink format
- [ ] Handle variables, conditions, choices
- [ ] Validation for Ink-unsupported features

### 4.3 Ren'Py Export

- [ ] Convert to Ren'Py script format
- [ ] Map passages to labels
- [ ] Generate menu blocks for choices

### 4.4 EPUB Export

- [ ] Static "choose your own adventure" book format
- [ ] Table of contents from story structure
- [ ] Metadata from story meta section

### 4.5 JSON/Twine Export

- [ ] Clean JSON for custom integrations
- [ ] Twine/Twee format compatibility

---

## Phase 5: Desktop App

Fulfill the "Windows-first" promise.

### 5.1 Tauri Shell

- [ ] Wrap web app in Tauri 2.0
- [ ] Native file open/save dialogs
- [ ] Recent files list
- [ ] Auto-save

### 5.2 Offline First

- [ ] Local SQLite database
- [ ] Work without internet
- [ ] Optional cloud sync

### 5.3 System Integration

- [ ] `.story` file association
- [ ] Double-click to open
- [ ] Drag files onto window

---

## Phase 6: Rich Editing Experience

### 6.1 Prose Editor

- [ ] Markdown support in passage content
- [ ] Bold, italic, links
- [ ] Preview rendered text

### 6.2 YAML Editor Upgrade

- [ ] Syntax highlighting (CodeMirror or Monaco)
- [ ] Auto-complete for node IDs
- [ ] Inline validation errors
- [ ] Find & replace

### 6.3 Writing Tools

- [ ] Word count per node/total
- [ ] Reading time estimate
- [ ] Character/location tracker (extracted from content)

---

## Phase 7: Collaboration & Polish

### 7.1 Multi-User

- [ ] Real-time collaboration (WebSocket)
- [ ] Cursor presence
- [ ] Conflict resolution UI

### 7.2 Git Integration

- [ ] Visual diff for .story files
- [ ] Branch comparison
- [ ] Merge conflict helper

### 7.3 Accessibility

- [ ] Full keyboard navigation
- [ ] Screen reader testing
- [ ] ARIA labels on all controls
- [ ] High contrast theme

### 7.4 Documentation

- [ ] Interactive tutorial (in-app)
- [ ] Documentation site
- [ ] Example stories gallery
- [ ] Video walkthroughs

---

## Phase 8: Ecosystem

### 8.1 Plugin System

- [ ] Custom node types
- [ ] Export format plugins
- [ ] Theme plugins

### 8.2 Community

- [ ] Story sharing (optional cloud)
- [ ] Template library
- [ ] Community showcase

### 8.3 Integrations

- [ ] VS Code extension (syntax highlighting, validation)
- [ ] GitHub Action for CI validation
- [ ] Discord bot for story previews

---

## Priority Matrix

| Feature             | Impact   | Effort | Priority      |
| ------------------- | -------- | ------ | ------------- |
| Fix story creation  | High     | Low    | **P0 - Now**  |
| Visual node editor  | Critical | High   | **P1 - Next** |
| HTML player export  | High     | Medium | **P1**        |
| Desktop app (Tauri) | High     | Medium | **P2**        |
| Ink/Ren'Py export   | Medium   | Medium | **P2**        |
| Rich text editor    | Medium   | Medium | **P3**        |
| Real-time collab    | Low      | High   | **P4**        |
| Plugin system       | Low      | High   | **P5**        |

---

## Success Metrics

1. **Can a writer create a branching story without touching YAML?** → Node editor
2. **Can they export to their target platform?** → Export pipeline
3. **Can they work offline on Windows?** → Desktop app
4. **Is the format actually Git-friendly in practice?** → Git integration
5. **Can a blind user write a story?** → Accessibility

---

## Non-Goals (For Now)

- Mobile app
- AI story generation
- Voice/audio integration
- Multiplayer game runtime
- Monetization features

---

## Contributing

This is an open roadmap. Priorities shift based on user feedback.

**Want to help?**

1. Pick an item from Phase 3-4
2. Open an issue to discuss approach
3. Submit a PR

The core engine is solid. The UI needs love.
