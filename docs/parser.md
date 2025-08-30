# Ollama Parser Specification

## Overview
The parser feature uses [Ollama](https://ollama.ai/) to analyze HTML and return feedback such as structural suggestions or error messages. It is implemented in the Streamlit script `ollama_app.py`.

## Endpoint
- **Base URL**: `http://localhost:11434`
- **API Path**: `/api/generate`
- **Request**:
  ```json
  {
    "model": "<model-name>",
    "prompt": "<HTML content to analyze>"
  }
  ```
- **Response**: JSON stream where each message chunk contains generated text. Collect all `response` fields to obtain the full parser output.

## Usage Flow
1. User triggers analysis (e.g., via toolbar button).
2. `analyzeHtml(html)` sends a POST request to the Ollama endpoint with the editor contents.
3. Display the aggregated parser response in a dedicated panel or modal.
4. Handle network errors or empty responses with user-friendly messages.

## Error Handling
- If the Ollama server is unreachable, inform the user without disrupting editing.
- Timeout requests after a reasonable period and allow retry.

## Security Considerations
- Only connect to a local Ollama instance; no remote data is transmitted.
- Sanitize HTML before displaying parser output to avoid injection.
