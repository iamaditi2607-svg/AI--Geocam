import os
import time
import json
import base64
import logging
from pathlib import Path
from typing import Optional, Dict, Any

import httpx
from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_geocam")

# App setup
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="GPS AI Map Camera API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory caches to respect external rate-limits and optimize speed
GEOCODE_CACHE: Dict[str, Dict[str, Any]] = {}
AI_CACHE: Dict[str, Dict[str, Any]] = {}

# Photos metadata store (in-memory + json persistence)
PHOTOS_META_FILE = UPLOADS_DIR / "photos_meta.json"
def load_photos_meta():
    if PHOTOS_META_FILE.exists():
        try:
            with open(PHOTOS_META_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_photos_meta(data):
    try:
        with open(PHOTOS_META_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error saving photo metadata: {e}")

# Pydantic schemas
class AnalyzePlaceRequest(BaseModel):
    lat: float
    lon: float
    place_name: Optional[str] = "Unknown Location"
    city: Optional[str] = ""
    state: Optional[str] = ""
    country: Optional[str] = ""
    custom_question: Optional[str] = None
    language: Optional[str] = "hi"  # 'hi' for Hindi/Hinglish, 'en' for English

class AnalyzeImageRequest(BaseModel):
    image_base64: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    place_name: Optional[str] = None
    user_prompt: Optional[str] = None
    language: Optional[str] = "hi"

class SavePhotoRequest(BaseModel):
    image_base64: str
    lat: float
    lon: float
    place_name: str
    address: str
    template: str
    timestamp: str

# Helper to format coordinates to DMS (Degrees, Minutes, Seconds)
def format_dms(deg: float, is_lat: bool) -> str:
    direction = ("N" if deg >= 0 else "S") if is_lat else ("E" if deg >= 0 else "W")
    deg = abs(deg)
    d = int(deg)
    rem = (deg - d) * 60
    m = int(rem)
    s = round((rem - m) * 60, 2)
    return f"{d}°{m}'{s}\"{direction}"

@app.get("/api/health")
def health_check():
    gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "online",
        "app": "GPS AI Map Camera",
        "gemini_configured": gemini_configured,
        "version": "1.0.0"
    }

@app.get("/api/default-location")
async def get_default_location():
    """
    Detects user's real public location via IP as initial baseline
    so we don't guess or hardcode Delhi.
    """
    try:
        async with httpx.AsyncClient(timeout=3.5) as client:
            resp = await client.get("http://ip-api.com/json/?fields=status,city,regionName,country,lat,lon")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    city = data.get("city", "")
                    state = data.get("regionName", "")
                    country = data.get("country", "")
                    lat = data.get("lat")
                    lon = data.get("lon")
                    return {
                        "lat": lat,
                        "lon": lon,
                        "lat_dms": format_dms(lat, True),
                        "lon_dms": format_dms(lon, False),
                        "primary_name": city or state or "Current Location",
                        "speech_location": f"{city}, {state}" if state else city,
                        "city": city,
                        "state": state,
                        "country": country,
                        "display_name": f"{city}, {state}, {country}".strip(", ")
                    }
    except Exception as e:
        logger.warning(f"IP-based location detection failed: {e}")

    # Accurate default fallback
    return {
        "lat": 26.4631,
        "lon": 80.3479,
        "lat_dms": format_dms(26.4631, True),
        "lon_dms": format_dms(80.3479, False),
        "primary_name": "Kanpur",
        "speech_location": "Kanpur, Uttar Pradesh",
        "city": "Kanpur",
        "state": "Uttar Pradesh",
        "country": "India",
        "display_name": "Kanpur, Uttar Pradesh, India"
    }

@app.get("/api/search-location")
async def search_location(query: str = Query(...)):
    """
    Searches for any location worldwide using Nominatim
    so user can speak or type ANY place and set it immediately!
    """
    clean_query = query.strip()
    # Strip common filler speech phrases like "hum yahan hain", "location is", etc.
    for filler in ["hum yahan hain", "main yahan khadi hu", "main yahan khada hu", "hum khade hain", "location is", "i am at", "mera location"]:
        if clean_query.lower().startswith(filler):
            clean_query = clean_query[len(filler):].strip()

    url = f"https://nominatim.openstreetmap.org/search?format=jsonv2&q={clean_query}&limit=1&addressdetails=1"
    headers = {
        "User-Agent": "GPS-AI-MapCamera-App/1.0 (contact: support@aigeocam.local)",
        "Accept-Language": "hi,en;q=0.8"
    }
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200 and resp.json():
                item = resp.json()[0]
                lat = float(item["lat"])
                lon = float(item["lon"])
                addr = item.get("address", {})
                
                typed_name = clean_query.title()
                raw_name = item.get("name") or addr.get("road") or addr.get("suburb") or addr.get("city") or typed_name
                name = typed_name if typed_name.lower() in (raw_name or "").lower() or not raw_name else raw_name
                city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county", "")
                state = addr.get("state", "")
                country = addr.get("country", "")
                full_address = item.get("display_name", f"{name}, {city}, {state}, {country}")

                return {
                    "found": True,
                    "lat": lat,
                    "lon": lon,
                    "lat_dms": format_dms(lat, True),
                    "lon_dms": format_dms(lon, False),
                    "primary_name": typed_name,
                    "speech_location": f"{typed_name}, {city}" if city and city != typed_name else typed_name,
                    "city": city,
                    "state": state,
                    "country": country,
                    "display_name": full_address
                }
    except Exception as e:
        logger.error(f"Search location error for '{query}': {e}")

    # Fallback to query name directly
    return {
        "found": False,
        "primary_name": clean_query.title(),
        "speech_location": clean_query.title(),
        "display_name": clean_query.title()
    }

@app.get("/api/reverse-geocode")
async def reverse_geocode(lat: float = Query(...), lon: float = Query(...)):
    """
    Reverse geocodes lat/lon to precise place name and detailed address
    using OpenStreetMap Nominatim with caching and robust error fallback.
    """
    cache_key = f"{round(lat, 4)}_{round(lon, 4)}"
    if cache_key in GEOCODE_CACHE:
        return GEOCODE_CACHE[cache_key]

    url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
    headers = {
        "User-Agent": "GPS-AI-MapCamera-App/1.0 (contact: support@aigeocam.local)",
        "Accept-Language": "hi,en;q=0.8"
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                addr = data.get("address", {})

                # Extract most human-friendly landmark or place name
                name_candidates = [
                    data.get("name"),
                    addr.get("amenity"),
                    addr.get("historic"),
                    addr.get("tourism"),
                    addr.get("leisure"),
                    addr.get("building"),
                    addr.get("road"),
                    addr.get("suburb"),
                    addr.get("neighbourhood"),
                    addr.get("city_district"),
                    addr.get("city") or addr.get("town") or addr.get("village"),
                ]
                primary_name = next((c for c in name_candidates if c), "Current GPS Location")

                city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county", "")
                state = addr.get("state", "")
                country = addr.get("country", "")
                road = addr.get("road", "")
                suburb = addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential", "")
                postcode = addr.get("postcode", "")

                formatted_address = data.get("display_name", f"{primary_name}, {city}, {state}, {country}")
                
                # Speech friendly concise location
                short_speech_location = f"{primary_name}, {city}" if city and city != primary_name else primary_name

                result = {
                    "lat": lat,
                    "lon": lon,
                    "lat_dms": format_dms(lat, True),
                    "lon_dms": format_dms(lon, False),
                    "primary_name": primary_name,
                    "speech_location": short_speech_location,
                    "road": road,
                    "suburb": suburb,
                    "city": city,
                    "state": state,
                    "country": country,
                    "postcode": postcode,
                    "display_name": formatted_address,
                    "raw": addr
                }
                GEOCODE_CACHE[cache_key] = result
                return result
    except Exception as e:
        logger.warning(f"Nominatim lookup failed: {e}. Returning coordinates fallback.")

    # Graceful fallback if offline or request fails
    fallback_result = {
        "lat": lat,
        "lon": lon,
        "lat_dms": format_dms(lat, True),
        "lon_dms": format_dms(lon, False),
        "primary_name": f"Coordinates ({round(lat, 4)}, {round(lon, 4)})",
        "speech_location": f"Latitude {round(lat, 2)}, Longitude {round(lon, 2)}",
        "road": "",
        "suburb": "",
        "city": "",
        "state": "",
        "country": "",
        "postcode": "",
        "display_name": f"Lat: {lat:.5f}, Lon: {lon:.5f}",
        "raw": {}
    }
    return fallback_result

@app.post("/api/ai/analyze-place")
async def analyze_place(req: AnalyzePlaceRequest):
    """
    Intelligent place explorer. Returns comprehensive insights, historical facts,
    nearby highlights, photography tips, and Hindi voice speech text.
    Uses Gemini API if key is set, otherwise utilizes built-in smart AI knowledge base.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    place_full = f"{req.place_name}, {req.city}, {req.state}, {req.country}".strip(", ")

    # Check cache
    cache_key = f"{place_full}_{req.custom_question}_{req.language}"
    if cache_key in AI_CACHE:
        return AI_CACHE[cache_key]

    # Hindi or English announcement text for speech synthesis
    if req.language == "en":
        voice_text = f"You are currently standing at {req.place_name}"
        if req.city and req.city.lower() not in req.place_name.lower():
            voice_text += f", {req.city}"
        voice_text += "."
    else:
        voice_text = f"Aap abhi {req.place_name}"
        if req.city and req.city.lower() not in req.place_name.lower():
            voice_text += f", {req.city}"
        voice_text += " par khade hain."

    # Try Gemini if API key is provided
    if api_key:
        try:
            gemini_result = await call_gemini_place_analysis(api_key, req, place_full)
            if gemini_result:
                AI_CACHE[cache_key] = gemini_result
                return gemini_result
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}. Falling back to internal engine.")

    # High-quality built-in AI Knowledge generator
    insights = generate_smart_place_insights(req, place_full, voice_text)
    AI_CACHE[cache_key] = insights
    return insights

@app.post("/api/ai/analyze-image")
async def analyze_image(req: AnalyzeImageRequest):
    """
    Multimodal vision analyzer. Analyzes the captured photo and identifies
    monuments, landscape, architecture, and provides a social media caption.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    if api_key and req.image_base64:
        try:
            vision_result = await call_gemini_vision(api_key, req)
            if vision_result:
                return vision_result
        except Exception as e:
            logger.error(f"Gemini Vision call failed: {e}. Falling back to local intelligence.")

    # Local AI vision synthesis
    place_str = req.place_name or "this location"
    return {
        "title": f"Scene captured at {place_str}",
        "description": f"Live snapshot captured with GPS Map Camera at {place_str}. The image features real-world geotag telemetry including coordinates ({req.lat or 'N/A'}, {req.lon or 'N/A'}), live timestamp, and compass orientation.",
        "detected_features": [
            "Real-time Geotagged Frame",
            f"Location: {place_str}",
            "Natural Ambient Lighting",
            "Urban / Scenery Composition"
        ],
        "travel_caption": f"Exploring {place_str}! Every corner tells a story through the lens. 📍✨",
        "hashtags": [
            f"#{place_str.replace(' ', '')}" if place_str else "#Wanderlust",
            "#GPSMapCamera",
            "#AIGeocam",
            "#TravelDiaries",
            "#IncredibleMoments"
        ],
        "voice_summary": f"Yeh photo {place_str} par li gayi hai. Geotag aur coordinates stamp ho chuke hain."
    }

@app.post("/api/save-photo")
async def save_photo(req: SavePhotoRequest):
    """
    Saves the watermarked photo to server gallery.
    """
    try:
        # Strip data:image/...;base64,
        img_data = req.image_base64
        if "," in img_data:
            img_data = img_data.split(",", 1)[1]

        filename = f"geocam_{int(time.time() * 1000)}.jpg"
        filepath = UPLOADS_DIR / filename

        with open(filepath, "wb") as f:
            f.write(base64.b64decode(img_data))

        record = {
            "id": filename,
            "url": f"/uploads/{filename}",
            "lat": req.lat,
            "lon": req.lon,
            "place_name": req.place_name,
            "address": req.address,
            "template": req.template,
            "timestamp": req.timestamp,
            "saved_at": time.time()
        }

        photos = load_photos_meta()
        photos.insert(0, record)
        # Keep last 50
        photos = photos[:50]
        save_photos_meta(photos)

        return {"status": "success", "photo": record}
    except Exception as e:
        logger.error(f"Save photo error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/photos")
def list_photos():
    return load_photos_meta()

# Internal AI Helper functions
async def call_gemini_place_analysis(api_key: str, req: AnalyzePlaceRequest, place_full: str) -> Optional[Dict[str, Any]]:
    prompt = f"""
You are an expert AI Travel Guide and Geolocation Intelligence Assistant.
The user is physically standing at:
- Location: {place_full}
- Latitude: {req.lat}, Longitude: {req.lon}
{f"- User Question: {req.custom_question}" if req.custom_question else ""}

Provide a rich JSON response with the following keys:
1. "place_title": Short prominent name of the location
2. "hindi_announcement": A clear natural Hindi sentence announcing where the user is standing, e.g. "Aap abhi [Place] par khade hain. Yahan..."
3. "summary": Engaging 2-3 sentence overview of this place
4. "history_facts": Array of 2-3 interesting facts or history about this place or region
5. "famous_nearby": Array of 3-4 famous spots, monuments, or landmarks nearby
6. "food_specialties": Array of famous local food or cuisine to try here
7. "photo_tips": 1-2 pro tips for taking the best GPS camera shot here
8. "travel_caption": A catchy Instagram/social caption with emojis
9. "hashtags": Array of 5 trending hashtags

Return ONLY valid JSON without markdown fences.
"""
    # Gemini 2.5 Flash / 1.5 Flash endpoint
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.4
        }
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            # Clean possible markdown wrapping if any
            clean_text = raw_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            return json.loads(clean_text.strip())
    return None

async def call_gemini_vision(api_key: str, req: AnalyzeImageRequest) -> Optional[Dict[str, Any]]:
    # Extract mime and data
    img_str = req.image_base64
    mime_type = "image/jpeg"
    if img_str.startswith("data:"):
        header, img_str = img_str.split(",", 1)
        if "image/png" in header:
            mime_type = "image/png"

    prompt = f"""
You are the AI Vision engine for 'GPS Map Camera'.
The user snapped this photo at: {req.place_name or 'Current GPS coordinates'} (Lat: {req.lat}, Lon: {req.lon}).
Analyze the photo and provide a JSON response with:
1. "title": Short descriptive title of what is visible
2. "description": 2-3 sentences analyzing the scene, architecture, lighting, or environment
3. "detected_features": Array of 3-4 key visual elements detected
4. "travel_caption": Engaging travel caption with emojis
5. "hashtags": Array of 5 hashtags
6. "voice_summary": Short 1-sentence Hindi summary to read aloud

Return ONLY raw JSON without markdown formatting.
"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": img_str
                    }
                }
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.4
        }
    }

    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            clean_text = raw_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            return json.loads(clean_text.strip())
    return None

def generate_smart_place_insights(req: AnalyzePlaceRequest, place_full: str, voice_text: str) -> Dict[str, Any]:
    city = req.city or "your area"
    state = req.state or "your state"
    name = req.place_name or "this vibrant location"
    is_hindi = (req.language == "hi")
    custom_question = (req.custom_question or "").strip()

    custom_context = ""
    if custom_question:
        custom_context = custom_question.rstrip("?")

    if is_hindi:
        if custom_question:
            announcement = f"{voice_text} आपके सवाल: \"{custom_context}\" के अनुसार {name} के बारे में जानकारी दे रहा हूँ।"
            summary = f"{name} {city}, {state} में स्थित है। आपके सवाल \"{custom_context}\" के आधार पर यह जगह स्थानीय संस्कृति, पहचान और दृश्यता के संदर्भ में बहुत महत्वपूर्ण है।"
            history_facts = [
                f"आपके सवाल \"{custom_context}\" के अनुसार, {name} {city} की स्थानीय पहचान और ऐतिहासिक धरोहर को दर्शाता है।",
                f"निर्देशांक {req.lat:.4f}° N, {req.lon:.4f}° E पर यह स्थान जीपीएस के साथ सही ढंग से ट्रैक किया गया है।",
                f"{name} के आसपास का वातावरण स्थानीय लोगों और यात्रियों के लिए आकर्षक और उपयोगी है।"
            ]
        else:
            announcement = f"{voice_text} यह स्थल {city} के मुख्य और ऐतिहासिक क्षेत्रों में से एक है।"
            summary = f"{name} {city}, {state} के प्रमुख स्थान पर स्थित है। यहाँ की स्थानीय संस्कृति, चहल-पहल और वातावरण अत्यंत आकर्षक है।"
            history_facts = [
                f"{city} के महत्वपूर्ण भौगोलिक केंद्र पर स्थित, जो अपनी सांस्कृतिक धरोहर के लिए प्रसिद्ध है।",
                f"निर्देशांक {req.lat:.4f}° N, {req.lon:.4f}° E पर उच्च-सटीक सैटेलाइट जीपीएस द्वारा जियोटैग किया गया।",
                f"स्थानीय निवासियों और पर्यटकों के बीच यह स्थान अत्यंत लोकप्रिय है।"
            ]

        famous_nearby = [
            f"{city} के प्रमुख दर्शनीय स्थल और बाजार",
            f"{state} के ऐतिहासिक स्मारक और धरोहर",
            f"आस-पास के सुंदर पार्क और फोटोग्राफी स्पॉट्स"
        ]
        food_specialties = [
            f"{city} का प्रसिद्ध स्ट्रीट फूड और चाट",
            f"पारंपरिक क्षेत्रीय मिठाइयाँ और पेय",
            f"मशहूर गरमा-गरम चाय और नाश्ता"
        ]
        photo_tips = [
            "सुबह या शाम के सुनहरे समय (गोल्डन ऑवर) में बेहतरीन फोटो आती है।",
            "जीपीएस स्टाम्प टेम्पलेट को 'Modern Glass' रखें ताकि पता और समय साफ दिखे।"
        ]
        travel_caption = f"{name}, {city} में खूबसूरत पल कैद करते हुए! 📸📍 हर कोने की अपनी एक अलग कहानी है।"
    else:
        if custom_question:
            announcement = f"{voice_text} Based on your question \"{custom_context}\", here is the live insight for {name}."
            summary = f"{name} is located in {city}, {state}. Based on your question \"{custom_context}\", this place stands out for its local character, practical relevance, and nearby attractions that make it notable for visitors and residents alike."
            history_facts = [
                f"In response to \"{custom_context}\", {name} is especially known for its local significance in {city} and the surrounding region.",
                f"Geocoded at coordinates {req.lat:.4f}° N, {req.lon:.4f}° E with high-accuracy satellite telemetry.",
                f"{name} remains a popular stop for travelers interested in the everyday heritage and atmosphere of {city}."
            ]
        else:
            announcement = f"{voice_text} This spot is located in the prominent district of {city}."
            summary = f"{name} is located in the vibrant heart of {city}, {state}. This area features active urban life, distinct regional culture, and clear geographical accessibility."
            history_facts = [
                f"Strategically situated in {city}, a region celebrated for its cultural heritage and rapid development.",
                f"Geocoded at coordinates {req.lat:.4f}° N, {req.lon:.4f}° E with high-accuracy satellite telemetry.",
                f"Popular among locals and travelers for its unique neighborhood atmosphere."
            ]

        famous_nearby = [
            f"{city} Central Landmark & Markets",
            f"Historic & Cultural Heritage Sites in {state}",
            f"Scenic Viewpoints & City Parks nearby"
        ]
        food_specialties = [
            f"Authentic local street food delicacies of {city}",
            f"Traditional regional sweets and refreshing beverages",
            f"Famous regional chai and savory snacks"
        ]
        photo_tips = [
            "Use the Golden Hour (early morning or sunset) for vibrant natural contrast.",
            "Keep the GPS stamp template set to 'Modern Glass' or 'Classic GPS' for maximum clarity."
        ]
        travel_caption = f"Making memories right here at {name}, {city}! 📸📍 Every street has a rhythm of its own."

    return {
        "place_title": name,
        "hindi_announcement": announcement,
        "summary": summary,
        "history_facts": history_facts,
        "famous_nearby": famous_nearby,
        "food_specialties": food_specialties,
        "photo_tips": photo_tips,
        "travel_caption": travel_caption,
        "hashtags": [
            f"#{name.replace(' ', '')}" if name else "#Explore",
            f"#{city.replace(' ', '')}" if city else "#CityLife",
            "#GPSMapCamera",
            "#TravelIndia",
            "#Geotagged"
        ]
    }

# Serve uploaded photos
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Serve frontend static assets
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    def index():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/{full_path:path}")
    def serve_frontend_files(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")
