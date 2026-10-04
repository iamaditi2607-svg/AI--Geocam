# GPS Map Camera - AI Vision & Smart Geotagging

A browser-based GPS camera with live geotagging, AI-powered place insights, an interactive map, voice announcements, and photo watermarking. The interface includes a language selector.

## Features

- Live camera preview with GPS coordinates, altitude, accuracy, date, and time.
- Four watermark templates: Modern Glass, Classic GPS, Cyber HUD, and Minimalist.
- Reverse geocoding, place search, and an interactive map with street, satellite, and dark layers.
- Voice announcements and voice-based location search.
- AI place summaries, nearby highlights, local food suggestions, photography tips, and travel captions.
- Capture, preview, download, and share geotagged photos.
- Optional Gemini API key for enhanced image and landmark analysis.

## Requirements

- Python 3.10 or newer
- A modern browser with camera and location permissions enabled

## Run Locally

From the project directory, create an environment and install dependencies:

```powershell
python -m venv backend/venv
.\backend\venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
```

Start the application:

```powershell
python run.py
```

The launcher starts the server at <http://localhost:8000> and opens it in your browser. On Windows, you can also double-click `start_app.bat` after installing the requirements.

To use Gemini features, copy `backend/.env.example` to `backend/.env` and add your API key. The `.env` file is ignored by Git.

## Mobile Testing

Connect your phone and computer to the same Wi-Fi network, then open the mobile URL printed by the launcher. Grant camera and location permissions when prompted. Browser security requirements may vary when accessing the app over a local network.

## Privacy

Captured photos and their location metadata are stored locally in `backend/uploads/`. They are excluded from Git by default and should not be committed to a public repository.
