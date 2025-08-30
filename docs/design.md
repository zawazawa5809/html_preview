# Design

## Architecture Overview
- **Single-file application**: `index.html` contains markup, styles, and scripts.
- **Event-driven UI**: toolbar actions and editor events update application state.
- **State management**: simple JavaScript objects combined with browser `localStorage` for persistence.
- **Preview rendering**: an `iframe` displays the current HTML in isolation.
- **Ollama parser integration**: optional module sends HTML to a local Ollama server for analysis.
- **Streamlit analyzer**: `ollama_app.py` fetches HTML from a URL and streams analysis results from Ollama.

## Implementation Details
- **Layout Management**: `applyLayout` switches between left-right, top-bottom, and preview-only modes.
- **Preview Updates**: `updatePreview` injects editor content into the `iframe`.
- **Line Numbers**: `updateLineNumbers` and `syncScroll` keep line numbers aligned with the editor.
- **Resizing**: mouse/touch handlers on the gutter adjust panel sizes.
- **Storage**: `saveCode` and `loadSavedCode` persist the editor state.
- **Export**: `saveToFile` creates a downloadable HTML file using the document title.
- **Parser Hook**: `analyzeHtml` (to be implemented) communicates with Ollama and displays results.
- **External Libraries**: Feather Icons and Lodash are loaded via CDN.

## File Structure
```
/
├── ollama_app.py       # Streamlit entry point for Ollama analysis
├── index.html           # main application
└── docs/
    ├── requirements.md  # project requirements
    ├── design.md        # architecture and implementation details
    └── parser.md        # Ollama parser specification
```
