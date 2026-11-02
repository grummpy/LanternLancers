@echo off
REM One-click launcher for Lantern Lancers on Windows.
cd /d "%~dp0"
where py >nul 2>&1 && (
  py -3 server.py
  goto :eof
)
where python >nul 2>&1 && (
  python server.py
  goto :eof
)
echo Python 3 is required to launch Lantern Lancers.
echo Install Python 3 from https://www.python.org/downloads/ and try again.
pause
exit /b 1
