#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo " Starting CareFlow Backend (FastAPI + Local Ollama)"
echo "=========================================================="
echo " [!] MANDATORY LOCAL AI PRE-FLIGHT:"
echo "     Ensure Ollama is running in your terminal:"
echo "     $ ollama run llama3"
echo "     Ollama endpoint: http://localhost:11434"
echo "=========================================================="

# Check if local Ollama server is reachable
if command -v curl &> /dev/null; then
    if curl -s -f http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo " [✓] Local Ollama daemon detected and responsive."
    else
        echo " [i] Note: Ollama daemon not detected at http://localhost:11434."
        echo "     CareFlow will boot normally with high-fidelity deterministic fallback."
        echo "     Run 'ollama run llama3' in a terminal window for live local LLM inference."
    fi
fi
echo "=========================================================="

# Identify Python / Uvicorn executable
if [ -f "backend/venv/bin/uvicorn" ]; then
    UVICORN="backend/venv/bin/uvicorn"
elif [ -f "venv/bin/uvicorn" ]; then
    UVICORN="venv/bin/uvicorn"
elif command -v uvicorn &> /dev/null; then
    UVICORN="uvicorn"
else
    UVICORN="python3 -m uvicorn"
fi

export PYTHONPATH=.
exec $UVICORN backend.app.main:app --reload --host 0.0.0.0 --port 8000
