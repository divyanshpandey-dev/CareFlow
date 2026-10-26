@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo  Starting CareFlow Backend (FastAPI + Local Ollama)
echo ==========================================================
echo  [!] MANDATORY LOCAL AI PRE-FLIGHT:
echo      Ensure Ollama is running in your terminal:
echo      ^> ollama run llama3
echo      Ollama endpoint: http://localhost:11434
echo ==========================================================

curl -s -f http://localhost:11434/api/tags >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [^/] Local Ollama daemon detected and responsive.
) else (
    echo  [i] Note: Ollama daemon not detected at http://localhost:11434.
    echo      CareFlow will boot normally with high-fidelity deterministic fallback.
    echo      Run 'ollama run llama3' in a terminal window for live local LLM inference.
)
echo ==========================================================

set PYTHONPATH=.
if exist "backend\venv\Scripts\uvicorn.exe" (
    backend\venv\Scripts\uvicorn.exe backend.app.main:app --reload --host 0.0.0.0 --port 8000
) else if exist "venv\Scripts\uvicorn.exe" (
    venv\Scripts\uvicorn.exe backend.app.main:app --reload --host 0.0.0.0 --port 8000
) else (
    uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
)

