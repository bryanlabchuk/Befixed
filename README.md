# Befixed - Magic & Mechanical Repair Shop

A narrative puzzle game set in a high fantasy world where magic and machinery intertwine.

## Overview

**Befixed** is an 8-chapter narrative adventure game that combines storytelling with interactive puzzles. Set in a magical repair shop in the fantasy realm of Aethermist, you play as an artificer who inherits a workshop that can fix anything - from clockwork companions to enchanted artifacts.

### Features

- **Rich Narrative**: 8 chapters of story with branching dialogue and meaningful choices
- **Interactive Puzzles**: 5 unique puzzle types themed around magical and mechanical repair
- **Character-Driven**: Meet memorable characters including automatons, apprentices, and mysterious customers
- **Audio-Visual Experience**: Atmospheric music, sound effects, and particle effects
- **Accessible Design**: Multiple accessibility options including text sizes, high contrast, and reduced motion

## Technology Stack

- **Pure HTML5/CSS3/JavaScript** - No heavy frameworks, lightweight and fast
- **Web Audio API** - Immersive audio with spatial effects
- **Canvas API** - Particle effects and visual enhancements
- **ES6 Modules** - Clean, maintainable architecture
- **LocalStorage** - Save/load game progress

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (for loading JSON files)

### Running Locally

1. Clone the repository:
```bash
git clone https://github.com/yourusername/befixed.git
cd befixed
```

2. Start a local server:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (npx)
npx serve

# Using VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

3. Open in browser: `http://localhost:8000`

## Project Structure

```
Befixed/
├── index.html              # Main HTML file
├── README.md               # This file
├── assets/                 # Game assets
│   ├── audio/             # Sound files
│   │   ├── music/         # Background music
│   │   ├── sfx/           # Sound effects
│   │   └── voice/         # Voice acting (optional)
│   ├── images/            # Image assets
│   │   ├── backgrounds/   # Scene backgrounds
│   │   ├── characters/    # Character sprites
│   │   ├── items/         # Item images
│   │   └── ui/            # UI elements
│   └── fonts/             # Custom fonts
├── data/                   # Game data (JSON)
│   ├── chapters/          # Chapter content
│   │   ├── chapter1.json
│   │   ├── chapter2.json
│   │   └── ...
│   ├── puzzles/           # Puzzle configurations
│   ├── characters.json    # Character definitions
│   └── game-config.json   # Global configuration
├── src/                    # JavaScript source
│   ├── core/              # Core game systems
│   │   ├── GameManager.js
│   │   ├── StateManager.js
│   │   ├── SaveManager.js
│   │   └── SceneManager.js
│   ├── narrative/         # Dialogue & story
│   │   ├── DialogueRenderer.js
│   │   ├── NarrativeParser.js
│   │   ├── ChoiceManager.js
│   │   └── CharacterManager.js
│   ├── puzzles/           # Puzzle system
│   │   ├── PuzzleController.js
│   │   ├── PuzzleFactory.js
│   │   └── types/         # Puzzle implementations
│   ├── audio/             # Audio system
│   │   └── AudioManager.js
│   ├── visuals/           # Visual effects & UI
│   │   ├── UIManager.js
│   │   └── ParticleSystem.js
│   ├── input/             # Input handling
│   │   └── InputHandler.js
│   ├── utils/             # Utility functions
│   │   ├── EventEmitter.js
│   │   ├── AssetLoader.js
│   │   └── helpers.js
│   └── main.js            # Entry point
└── styles/                 # CSS styles
    ├── main.css           # Core styles
    ├── ui.css             # UI components
    ├── narrative.css      # Dialogue & narrative
    └── puzzles.css        # Puzzle styles
```

## Puzzle Types

### 1. Mechanical Assembly
Drag-and-drop puzzle for assembling clockwork components. Players must place parts in the correct positions following a schematic.

### 2. Spell Crafting
Pattern matching puzzle combining magical ingredients. Players select ingredients in the correct order to create enchantments.

### 3. Diagnosis
Deduction puzzle for examining broken items. Use different tools to identify problems and make a diagnosis.

### 4. Repair Sequence
Timed memory game matching button sequences. Watch, memorize, and repeat increasingly complex patterns.

### 5. Magical Resonance
Audio-based puzzle tuning frequencies. Match target tones by adjusting magical dials.

## Creating Content

### Adding a New Chapter

1. Create a new JSON file in `data/chapters/`:

```json
{
    "id": "chapter2",
    "number": 2,
    "title": "Your Chapter Title",
    "description": "Brief description",
    "scenes": [
        {
            "id": "scene_intro",
            "content": [
                {
                    "type": "dialogue",
                    "speaker": "Character Name",
                    "text": "Dialogue text here."
                }
            ]
        }
    ]
}
```

2. Reference backgrounds, music, and characters used in the chapter.

### Adding a New Puzzle

1. Add configuration to `data/puzzles/puzzle-configs.json`
2. Reference the puzzle in your chapter's scene content:

```json
{
    "type": "puzzle",
    "puzzleId": "your_puzzle_id"
}
```

### Dialogue Format

```json
{
    "type": "dialogue",
    "speaker": "Character Name",
    "text": "What they say. Use **bold** for emphasis.",
    "emotion": "neutral"
}
```

### Choice Format

```json
{
    "type": "choice",
    "prompt": "What do you do?",
    "options": [
        {
            "text": "First option",
            "next": "scene_id",
            "setFlag": "flag_name"
        },
        {
            "text": "Second option (requires item)",
            "condition": { "type": "item", "key": "item_id" },
            "next": "other_scene"
        }
    ]
}
```

## Customization

### Theme Colors

Edit CSS variables in `styles/main.css`:

```css
:root {
    --color-primary: #c9a227;        /* Golden brass */
    --color-secondary: #2d5a6b;      /* Deep teal */
    --color-magic: #7b68ee;          /* Magical purple */
    /* ... */
}
```

### Text Formatting in Dialogue

- `**bold**` → emphasis
- `[magic]text[/magic]` → magical glow
- `[whisper]text[/whisper]` → quieter text
- `[loud]text[/loud]` → louder text

## Save System

- 10 save slots plus autosave
- Saves stored in browser localStorage
- Export/import save functionality available

## Accessibility

- **Text Size**: Small, Normal, Large
- **Text Speed**: Slow, Normal, Fast, Instant
- **Dyslexia-Friendly Font**: Optional
- **High Contrast Mode**: Enhanced visibility
- **Reduce Motion**: Minimizes animations

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome  | 80+     |
| Firefox | 75+     |
| Safari  | 13+     |
| Edge    | 80+     |

## Development

### Debug Mode

Open browser console and access:

```javascript
window.befixed.gameManager   // Game state
window.befixed.events        // Event system
window.befixed.assets        // Asset loader
```

### Adding New Puzzle Types

1. Create class extending `PuzzleController`
2. Implement `render()`, `getSolution()`, `validateSolution()`
3. Register in `PuzzleFactory.registerDefaultTypes()`

## License

[Your License Here]

## Credits

**Created by:** Your Name/Studio

**Special Thanks:**
- All playtesters
- The open source community

---

*"Where magic meets machinery, anything can be fixed."*
