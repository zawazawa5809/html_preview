import json
import requests
import streamlit as st
from bs4 import BeautifulSoup

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3"


def fetch_html(url: str) -> str | None:
    """Fetch raw HTML from a URL."""
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        st.error(f"Failed to fetch HTML: {e}")
        return None


def parse_html(html: str) -> str:
    """Return a prettified version of the HTML using BeautifulSoup."""
    soup = BeautifulSoup(html, "html.parser")
    return soup.prettify()


def analyze_with_ollama(html: str) -> str | None:
    """Send HTML to Ollama and return the generated analysis."""
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={"model": MODEL_NAME, "prompt": html},
            stream=True,
            timeout=60,
        )
        resp.raise_for_status()
        result = ""
        for line in resp.iter_lines():
            if not line:
                continue
            try:
                chunk = json.loads(line.decode("utf-8"))
            except json.JSONDecodeError:
                continue
            if "response" in chunk:
                result += chunk["response"]
        return result
    except Exception as e:
        st.error(f"Ollama request failed: {e}")
        return None


st.title("HTML Parser with Ollama")
url = st.text_input("Enter URL")

if "raw_html" not in st.session_state:
    st.session_state.raw_html = ""
if "parsed_html" not in st.session_state:
    st.session_state.parsed_html = ""
if "ollama_result" not in st.session_state:
    st.session_state.ollama_result = ""

if st.button("Fetch & Parse HTML") and url:
    raw = fetch_html(url)
    if raw:
        st.session_state.raw_html = raw
        st.session_state.parsed_html = parse_html(raw)
        st.session_state.ollama_result = ""

st.text_area("Parsed HTML", st.session_state.parsed_html, height=300)

if st.button("Auto-parse with Ollama") and st.session_state.raw_html:
    result = analyze_with_ollama(st.session_state.raw_html)
    if result:
        st.session_state.ollama_result = result

if st.session_state.ollama_result:
    st.subheader("Ollama Analysis")
    st.text(st.session_state.ollama_result)
