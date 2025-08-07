# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a standalone HTML Preview application - a single-file web application that provides real-time HTML editing and preview capabilities with multiple layout options.

## Architecture

- **Single File Application**: Everything is contained in `html_preview.html`
- **No Build Process**: Direct HTML/CSS/JavaScript - no compilation or bundling required
- **No External Dependencies**: Self-contained with inline styles and scripts
- **LocalStorage Integration**: Automatically saves user's HTML code locally

## Core Features

1. **Real-time HTML Preview**: Updates as user types
2. **Layout Modes**: 
   - Left-Right split (lr)
   - Top-Bottom split (tb)
   - Preview only (po)
3. **Resizable Panels**: Drag gutter to resize editor/preview panels
4. **Line Numbers**: Synchronized with editor scrolling
5. **Auto-save**: Persists code to localStorage
6. **Export**: Save edited HTML as downloadable file

## Development Tasks

### Running the Application
Simply open `html_preview.html` in any modern web browser. No server required.

### Testing
Open in browser and verify:
- Preview updates in real-time
- Layout switching works correctly
- Panel resizing functions properly
- Save functionality exports correct file

## Code Structure

### Key Components
- **Toolbar** (lines 72-115): Layout controls and save button
- **Editor Container** (lines 339-349): HTML textarea with line numbers
- **Preview Panel** (lines 351-356): iframe for rendering HTML
- **JavaScript Logic** (lines 359-642):
  - Layout management: `applyLayout()`
  - Preview updates: `updatePreview()`
  - Line number sync: `updateLineNumbers()`, `syncScroll()`
  - Panel resizing: drag handlers
  - Storage: `saveCode()`, `loadSavedCode()`
  - File export: `saveToFile()`

## Common Modifications

### Adding New Toolbar Features
Add button in toolbar section (around line 306-335) and corresponding event handler in JavaScript section.

### Modifying Color Scheme
Update CSS variables in `:root` section (lines 14-55).

### Changing Default HTML Content
Modify the default template in `loadSavedCode()` function (lines 487-511).

## Important Notes

- The application uses an iframe for preview which provides isolation but may have cross-origin limitations
- Line numbers are synchronized with textarea scrolling through the `syncScroll()` function
- Panel resizing uses mouse/touch event handlers with proper cleanup to prevent memory leaks