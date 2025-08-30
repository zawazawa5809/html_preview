# Requirements

## Purpose
Provide a single-page HTML preview application with real-time HTML editing, preview, and optional analysis via an Ollama-based parser.

## Functional Requirements
1. Real-time preview updates as the user edits HTML.
2. Layout modes: left-right split, top-bottom split, and preview-only.
3. Resizable panels controlled by a draggable gutter.
4. Line numbers synchronized with the editor scroll position.
5. Automatic saving of code to browser `localStorage`.
6. Export of the current HTML as a downloadable file whose name reflects the document title.
7. Integration with a local Ollama parser service for HTML analysis.
   - Send the current HTML to the Ollama server over HTTP.
   - Display parser feedback or suggestions within the UI.
   - Handle connection or parsing errors gracefully.
   - A companion Streamlit script `ollama_app.py` can also fetch external HTML and analyze it via the same service.

## Non-Functional Requirements
1. Distributed as a single `index.html` file with inline CSS and JavaScript.
2. Runs offline in modern browsers without a build step.
3. Uses vanilla web APIs and minimal external libraries (e.g. Feather Icons, Lodash).
4. Code is structured and documented for maintainability.
