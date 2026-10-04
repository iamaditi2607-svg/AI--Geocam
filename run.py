import os
import sys
import socket
import webbrowser
import threading
import time
from pathlib import Path

# Force UTF-8 stdout and stderr on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Set root directory
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def open_browser(port):
    time.sleep(1.8)
    url = f"http://localhost:{port}"
    print(f"\n[+] Opening GPS Map Camera in browser: {url}\n")
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[!] Could not open browser automatically: {e}")
        print(f"[*] Please open this link manually in your browser: {url}")

def get_available_port(start_port: int = 8000, max_attempts: int = 20):
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("0.0.0.0", port))
                return port
        except OSError:
            continue
    return start_port


def main():
    preferred_port = int(os.getenv("PORT", 8000))
    port = get_available_port(preferred_port)
    if port != preferred_port:
        print(f"[*] Port {preferred_port} busy, switching to free port {port}.")

    local_ip = get_local_ip()

    print("===========================================================")
    print("      GPS MAP CAMERA - AI VISION & GEOTAGGING")
    print("===========================================================")
    print(f"[*] Local PC URL     : http://localhost:{port}")
    print(f"[*] Mobile Phone URL : http://{local_ip}:{port}")
    print("    (Phone aur Laptop ko same Wi-Fi par connect karke open karein)")
    print("===========================================================")
    print("[*] Starting FastAPI Server on port " + str(port) + "...")

    # Start browser opener thread
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    # Launch uvicorn
    try:
        import uvicorn
        uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False, log_level="info")
    except KeyboardInterrupt:
        print("\n[*] Server stopped by user.")
    except Exception as e:
        print(f"\n[!] Error launching server: {e}")

if __name__ == "__main__":
    main()
