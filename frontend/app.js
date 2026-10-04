/**
 * GPS MAP CAMERA - CORE APPLICATION SCRIPT
 * Full-featured GPS camera with live watermark stamping,
 * dual-pane AI assistant, voice place announcer, and interactive maps.
 */

// Application State
const AppState = {
  // Telemetry & Location
  coords: {
    lat: 28.6139,
    lon: 77.2090,
    accuracy: 10,
    altitude: 216,
    heading: 24,
    speed: 0
  },
  placeInfo: {
    primaryName: "Connaught Place",
    speechLocation: "Connaught Place, New Delhi",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    fullAddress: "Connaught Place, New Delhi, Delhi, 110001, India",
    latDms: "28°37'50\"N",
    lonDms: "77°12'32\"E"
  },
  locationFixed: false,
  
  // Camera & Video
  currentStream: null,
  videoTrack: null,
  facingMode: "environment", // "environment" (rear) or "user" (front)
  torchActive: false,
  gridActive: false,

  // Settings & Config
  template: "modern", // "modern", "classic", "cyber", "minimal"
  voiceLanguage: "hi-IN",
  autoVoiceEnabled: true,
  geminiApiKey: "",
  
  // Maps
  miniMap: null,
  mainMap: null,
  miniMarker: null,
  mainMarker: null,
  currentTileLayer: "street",
  tileLayers: {},

  // Language & Localization
  currentLanguage: "hi", // "hi" for Hindi, "en" for English

  // AI & Voice
  isSpeaking: false,
  isListening: false,
  speechSynth: window.speechSynthesis || null,
  speechRecognition: null,
  currentAiData: null,

  // Gallery
  capturedPhotos: []
};

// Bilingual Translations (Hindi & English)
const TRANSLATIONS = {
  hi: {
    langLabel: "हिंदी",
    voiceOn: "Voice: चालू",
    voiceOff: "Voice: बंद",
    stamp: "स्टाम्प:",
    currentSpot: "वर्तमान स्थान",
    voiceAnnounceBtn: "जगह का नाम बोलिए 🔊",
    voiceStatusHint: "क्लिक करें और जगह का नाम सुनें",
    voiceSpeaking: "जगह का नाम बोला जा रहा है...",
    tabAi: "AI सहायक",
    tabMap: "लाइव मैप",
    tabGallery: "सेव की गई फोटो",
    aiOverview: "AI स्थान विवरण",
    aiFamous: "प्रसिद्ध स्थल और इतिहास",
    aiFood: "स्थानीय खान-पान और फोटोग्राफी टिप्स",
    aiCaption: "ट्रैवल कैप्शन और हैशटैग",
    copyBtn: "कॉपी करें",
    copied: "कॉपी हो गया!",
    aiAsk: "AI से इस जगह के बारे में पूछें",
    askPlaceholder: "यहाँ के बारे में कुछ भी पूछिए...",
    btnAiScan: "AI स्कैन",
    mapStreet: "स्ट्रीट",
    mapSat: "सैटेलाइट",
    mapDark: "डार्क",
    recenter: "रीसेंटर",
    mapHint: "मैप पर कहीं भी क्लिक करके पिन बदल सकते हैं और वहाँ का फोटो वाटरमार्क ले सकते हैं!",
    galleryTitle: "कैप्चर की गई फोटो",
    galleryEmpty: "अभी तक कोई फोटो कैप्चर नहीं की गई।",
    galleryEmptySub: "शटर बटन दबाकर पहली फोटो खींचिए!",
    downloadPhoto: "फोटो डाउनलोड करें",
    aiVisionScan: "AI विज़न स्कैन",
    share: "शेयर करें"
  },
  en: {
    langLabel: "English",
    voiceOn: "Voice: ON",
    voiceOff: "Voice: OFF",
    stamp: "Stamp:",
    currentSpot: "CURRENT SPOT",
    voiceAnnounceBtn: "Announce Place Name 🔊",
    voiceStatusHint: "Click to hear location name aloud",
    voiceSpeaking: "Speaking place name...",
    tabAi: "AI Assistant",
    tabMap: "Live Map",
    tabGallery: "Saved Shots",
    aiOverview: "AI Place Overview",
    aiFamous: "Famous Nearby & History",
    aiFood: "Local Food & Photography Tips",
    aiCaption: "Travel Caption & Hashtags",
    copyBtn: "Copy",
    copied: "Copied!",
    aiAsk: "Ask AI About This Place",
    askPlaceholder: "Ask anything about this place...",
    btnAiScan: "AI SCAN",
    mapStreet: "Street",
    mapSat: "Satellite",
    mapDark: "Dark",
    recenter: "Recenter",
    mapHint: "Click anywhere on the map to change pin and inspect any place worldwide!",
    galleryTitle: "Captured Geotagged Photos",
    galleryEmpty: "No photos captured yet.",
    galleryEmptySub: "Tap shutter button to snap your first geotagged photo!",
    downloadPhoto: "Download Photo",
    aiVisionScan: "AI Vision Scan",
    share: "Share"
  }
};

function applyLanguage(lang) {
  AppState.currentLanguage = lang;
  AppState.voiceLanguage = lang === "hi" ? "hi-IN" : "en-US";
  try {
    localStorage.setItem("geocam_lang", lang);
  } catch (e) {}

  const t = TRANSLATIONS[lang] || TRANSLATIONS.hi;

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt("currentLangLabel", t.langLabel);
  setTxt("lblStamp", t.stamp);
  setTxt("lblCurrentSpot", t.currentSpot);
  setTxt("btnVoiceTextMain", t.voiceAnnounceBtn);
  setTxt("voiceStatusHint", t.voiceStatusHint);
  setTxt("tabLabelAi", t.tabAi);
  setTxt("tabLabelMap", t.tabMap);
  setTxt("tabLabelGallery", t.tabGallery);
  setTxt("lblAiOverview", t.aiOverview);
  setTxt("lblAiFamous", t.aiFamous);
  setTxt("lblAiFood", t.aiFood);
  setTxt("lblAiCaption", t.aiCaption);
  setTxt("lblBtnCopy", t.copyBtn);
  setTxt("lblAiAsk", t.aiAsk);
  setTxt("btnAiQuickText", t.btnAiScan);
  setTxt("btnMapStreet", t.mapStreet);
  setTxt("btnMapSat", t.mapSat);
  setTxt("btnMapDark", t.mapDark);
  setTxt("btnRecenterText", t.recenter);
  setTxt("mapHintText", t.mapHint);
  setTxt("lblGalleryTitle", t.galleryTitle);
  setTxt("lblGalleryEmpty", t.galleryEmpty);
  setTxt("lblGalleryEmptySub", t.galleryEmptySub);
  setTxt("btnDownloadText", t.downloadPhoto);
  setTxt("btnAiScanText", t.aiVisionScan);
  setTxt("btnShareText", t.share);

  const askInput = document.getElementById("customAiQueryInput");
  if (askInput) askInput.placeholder = t.askPlaceholder;

  const autoVoiceBtn = document.getElementById("autoVoiceToggleBtn");
  if (autoVoiceBtn) {
    const btnText = autoVoiceBtn.querySelector(".btn-text");
    if (btnText) btnText.textContent = AppState.autoVoiceEnabled ? t.voiceOn : t.voiceOff;
  }

  // If recognition is active, update language
  if (AppState.speechRecognition) {
    AppState.speechRecognition.lang = AppState.voiceLanguage;
  }

  // Refresh AI details in the new language if coordinates are fixed
  if (AppState.locationFixed) {
    fetchAiPlaceInsights();
  }
}

// Tile Layer URLs
const TILE_URLS = {
  street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
};

/* ===================================================================
   1. INITIALIZATION & SPLASH SCREEN CONTROLLER
   =================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadSavedSettings();
  applyLanguage(AppState.currentLanguage);
  initSplashScreen();
  initCamera();
  initGeolocation();
  initMaps();
  initVoiceAssistant();
  initUIEventListeners();
  startLiveClock();
  loadSavedPhotos();
});

function initSplashScreen() {
  const splash = document.getElementById("splashScreen");
  const bar = document.getElementById("splashProgressBar");
  const percentText = document.getElementById("splashPercent");
  const statusText = document.getElementById("splashStatus");
  const skipBtn = document.getElementById("skipSplashBtn");

  let progress = 0;
  const stages = [
    { pct: 25, msg: "Acquiring GPS Fix..." },
    { pct: 55, msg: "Calibrating Compass & HUD..." },
    { pct: 85, msg: "Starting AI Vision & Optics..." },
    { pct: 100, msg: "GPS Map Camera Ready!" }
  ];

  const timer = setInterval(() => {
    progress += 2;
    if (progress > 100) progress = 100;
    
    bar.style.width = `${progress}%`;
    percentText.textContent = `${progress}%`;

    const stage = stages.find(s => progress <= s.pct) || stages[stages.length - 1];
    statusText.innerHTML = `<i class="fa-solid fa-satellite fa-fade"></i> ${stage.msg}`;

    if (progress >= 100) {
      clearInterval(timer);
      setTimeout(() => dismissSplash(), 400);
    }
  }, 35);

  skipBtn.addEventListener("click", () => {
    clearInterval(timer);
    dismissSplash();
  });

  function dismissSplash() {
    splash.classList.add("fade-out");
    setTimeout(() => {
      splash.style.display = "none";
      // Auto announce if ready
      if (AppState.autoVoiceEnabled && AppState.placeInfo.primaryName) {
        setTimeout(() => speakPlaceName(), 800);
      }
    }, 600);
  }
}

/* ===================================================================
   2. CAMERA STREAM CONTROLLER
   =================================================================== */
async function initCamera() {
  const video = document.getElementById("cameraVideo");
  const fallback = document.getElementById("cameraOfflineFallback");

  if (AppState.currentStream) {
    AppState.currentStream.getTracks().forEach(t => t.stop());
  }

  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: AppState.facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    AppState.currentStream = stream;
    video.srcObject = stream;
    AppState.videoTrack = stream.getVideoTracks()[0];
    fallback.style.display = "none";
  } catch (err) {
    console.warn("Camera access failed or unavailable, fallback active:", err);
    fallback.style.display = "flex";
  }
}

async function switchCamera() {
  AppState.facingMode = AppState.facingMode === "environment" ? "user" : "environment";
  await initCamera();
}

async function toggleTorch() {
  const btn = document.getElementById("toggleTorchBtn");
  if (!AppState.videoTrack) return;
  
  try {
    const capabilities = AppState.videoTrack.getCapabilities?.() || {};
    if (capabilities.torch) {
      AppState.torchActive = !AppState.torchActive;
      await AppState.videoTrack.applyConstraints({
        advanced: [{ torch: AppState.torchActive }]
      });
      btn.classList.toggle("active", AppState.torchActive);
    } else {
      alert("Torch/Flashlight is not supported on this camera/browser.");
    }
  } catch (e) {
    console.warn("Torch toggle error:", e);
  }
}

function toggleGrid() {
  AppState.gridActive = !AppState.gridActive;
  const grid = document.getElementById("gridOverlay");
  const btn = document.getElementById("toggleGridBtn");
  grid.classList.toggle("active", AppState.gridActive);
  btn.classList.toggle("active", AppState.gridActive);
}

/* ===================================================================
   3. GEOLOCATION & REVERSE GEOCODING
   =================================================================== */
function initGeolocation() {
  if (!("geolocation" in navigator)) {
    console.warn("Geolocation not supported by browser. Using default coordinates.");
    fetchReverseGeocode(AppState.coords.lat, AppState.coords.lon);
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 2000
  };

  navigator.geolocation.watchPosition(
    position => {
      const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
      AppState.coords.lat = latitude;
      AppState.coords.lon = longitude;
      AppState.coords.accuracy = Math.round(accuracy || 5);
      AppState.coords.altitude = Math.round(altitude || 216);
      AppState.coords.heading = Math.round(heading || 24);
      AppState.coords.speed = Math.round((speed || 0) * 3.6);

      updateTelemetryUI();
      updateMapPins(latitude, longitude);

      if (!AppState.locationFixed) {
        AppState.locationFixed = true;
        fetchReverseGeocode(latitude, longitude, true);
      }
    },
    error => {
      console.warn("Geolocation error or permission denied:", error.message);
      // Fallback geocode default coordinates
      fetchReverseGeocode(AppState.coords.lat, AppState.coords.lon);
    },
    options
  );

  // Compass Device Orientation
  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", event => {
      if (event.alpha !== null) {
        const compassDir = Math.round(event.alpha);
        AppState.coords.heading = compassDir;
        document.getElementById("compassHeading").textContent = getCompassDirection(compassDir);
        document.getElementById("tagHeading").textContent = `${compassDir}°`;
      }
    }, true);
  }
}

function getCompassDirection(deg) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(deg / 45) % 8;
  return `${directions[index]} ${String(deg).padStart(3, '0')}°`;
}

async function fetchReverseGeocode(lat, lon, autoAnnounce = false) {
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const data = await res.json();
      AppState.placeInfo.primaryName = data.primary_name || "Detected Location";
      AppState.placeInfo.speechLocation = data.speech_location || data.primary_name;
      AppState.placeInfo.city = data.city || "";
      AppState.placeInfo.state = data.state || "";
      AppState.placeInfo.country = data.country || "";
      AppState.placeInfo.fullAddress = data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      AppState.placeInfo.latDms = data.lat_dms;
      AppState.placeInfo.lonDms = data.lon_dms;

      updatePlaceUI();
      fetchAiPlaceInsights();

      if (autoAnnounce && AppState.autoVoiceEnabled) {
        speakPlaceName();
      }
    }
  } catch (err) {
    console.error("Geocoding fetch error:", err);
  }
}

function updateTelemetryUI() {
  document.getElementById("headerAccuracy").textContent = `Acc: ±${AppState.coords.accuracy}m`;
  document.getElementById("stampAltitude").textContent = `Alt: ${AppState.coords.altitude}m`;
  document.getElementById("stampCoords").textContent = `${AppState.coords.lat.toFixed(4)}° N, ${AppState.coords.lon.toFixed(4)}° E`;
  document.getElementById("tagLatLon").textContent = `${AppState.coords.lat.toFixed(3)}, ${AppState.coords.lon.toFixed(3)}`;
  document.getElementById("tagSpeed").textContent = `${AppState.coords.speed} km/h`;
  document.getElementById("tagHeading").textContent = `${AppState.coords.heading}°`;
}

function updatePlaceUI() {
  // Watermark Elements
  document.getElementById("stampPrimaryName").textContent = AppState.placeInfo.primaryName;
  document.getElementById("stampFullAddress").textContent = AppState.placeInfo.fullAddress;
  
  // AI Hero Card Elements
  document.getElementById("aiCardPlaceName").textContent = AppState.placeInfo.primaryName;
  document.getElementById("aiCardAddress").textContent = AppState.placeInfo.fullAddress;
  document.getElementById("locUpdateTime").textContent = "Live Update";
}

async function applyManualLocation(query) {
  const cleanQuery = (query || "").trim();
  if (!cleanQuery) return;

  try {
    const res = await fetch(`/api/search-location?query=${encodeURIComponent(cleanQuery)}`);
    const data = await res.json();

    const resolvedName = data.primary_name || cleanQuery;
    const resolvedCity = data.city || cleanQuery;
    const resolvedState = data.state || "";
    const resolvedCountry = data.country || "";
    const resolvedAddress = data.display_name || `${resolvedName}, ${resolvedCity}`;

    AppState.locationFixed = true;
    AppState.placeInfo.primaryName = resolvedName;
    AppState.placeInfo.speechLocation = data.speech_location || resolvedName;
    AppState.placeInfo.city = resolvedCity;
    AppState.placeInfo.state = resolvedState;
    AppState.placeInfo.country = resolvedCountry;
    AppState.placeInfo.fullAddress = resolvedAddress;
    AppState.placeInfo.latDms = data.lat_dms || AppState.placeInfo.latDms;
    AppState.placeInfo.lonDms = data.lon_dms || AppState.placeInfo.lonDms;

    if (typeof data.lat === "number") AppState.coords.lat = data.lat;
    if (typeof data.lon === "number") AppState.coords.lon = data.lon;

    updatePlaceUI();
    updateTelemetryUI();
    updateMapPins(AppState.coords.lat, AppState.coords.lon);
    if (AppState.mainMap) {
      AppState.mainMap.setView([AppState.coords.lat, AppState.coords.lon], 14);
    }
    fetchAiPlaceInsights();

    if (AppState.autoVoiceEnabled) {
      speakPlaceName();
    }
  } catch (err) {
    console.error("Manual location lookup error:", err);
    alert("Location not found. Please type a more specific place name.");
  }
}

/* ===================================================================
   4. VOICE PLACE ANNOUNCER ("hum jhaa pr bhi khade ho uss jagah ka naam lele")
   =================================================================== */
function initVoiceAssistant() {
  // Speech Synthesis setup
  if (!AppState.speechSynth) {
    console.warn("Web Speech Synthesis not supported in this browser.");
    document.getElementById("voiceStatusHint").textContent = "Audio speech not supported";
    return;
  }

  // Speech Recognition setup (Mic input)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    AppState.speechRecognition = new SpeechRecognition();
    AppState.speechRecognition.lang = AppState.voiceLanguage;
    AppState.speechRecognition.continuous = false;
    AppState.speechRecognition.interimResults = false;

    AppState.speechRecognition.onresult = (event) => {
      const speechText = event.results[0][0].transcript;
      const input = document.getElementById("customAiQueryInput");
      input.value = speechText;
      triggerCustomAiQuery(speechText);
    };

    AppState.speechRecognition.onend = () => {
      AppState.isListening = false;
      document.getElementById("micVoiceQuestionBtn").classList.remove("listening");
    };

    AppState.speechRecognition.onerror = (e) => {
      console.warn("Speech recognition error:", e.error);
      AppState.isListening = false;
      document.getElementById("micVoiceQuestionBtn").classList.remove("listening");
    };
  }
}

/**
 * SPEAKS OUT THE PLACE NAME IN NATURAL HINDI / ENGLISH
 * User requirement: "hum jhaa pr bhi khade ho uss jagah ka naam lele bs"
 */
function speakPlaceName() {
  if (!AppState.speechSynth) return;

  // Cancel any ongoing speech
  AppState.speechSynth.cancel();

  const name = AppState.placeInfo.primaryName;
  const city = AppState.placeInfo.city;
  const isHindi = AppState.currentLanguage === "hi";
  
  let speechText;
  if (isHindi) {
    speechText = `आप अभी ${name}`;
    if (city && !name.toLowerCase().includes(city.toLowerCase())) {
      speechText += `, ${city}`;
    }
    speechText += " पर खड़े हैं।";
  } else {
    speechText = `You are currently standing at ${name}`;
    if (city && !name.toLowerCase().includes(city.toLowerCase())) {
      speechText += `, ${city}`;
    }
    speechText += ".";
  }

  // If custom AI speech quote is available
  if (AppState.currentAiData && AppState.currentAiData.hindi_announcement) {
    speechText = AppState.currentAiData.hindi_announcement;
  }

  const utterance = new SpeechSynthesisUtterance(speechText);
  utterance.lang = AppState.voiceLanguage;
  utterance.rate = 0.95; // Clear natural pace
  utterance.pitch = 1.0;

  // Visual cues
  const t = TRANSLATIONS[AppState.currentLanguage] || TRANSLATIONS.hi;
  const btn = document.getElementById("speakPlaceNameBtn");
  const hint = document.getElementById("voiceStatusHint");
  
  hint.textContent = t.voiceSpeaking;
  btn.style.boxShadow = "0 0 20px #00f2fe";

  utterance.onend = () => {
    hint.textContent = t.voiceStatusHint;
    btn.style.boxShadow = "";
  };

  AppState.speechSynth.speak(utterance);
}

function toggleVoiceRecognition() {
  if (!AppState.speechRecognition) {
    alert("Voice microphone input is not supported in this browser.");
    return;
  }

  const micBtn = document.getElementById("micVoiceQuestionBtn");
  if (AppState.isListening) {
    AppState.speechRecognition.stop();
    AppState.isListening = false;
    micBtn.classList.remove("listening");
  } else {
    AppState.speechRecognition.lang = AppState.voiceLanguage;
    AppState.speechRecognition.start();
    AppState.isListening = true;
    micBtn.classList.add("listening");
  }
}

/* ===================================================================
   5. AI PLACE ASSISTANT & EXPLORER
   =================================================================== */
async function fetchAiPlaceInsights(customQuestion = null) {
  const reqBody = {
    lat: AppState.coords.lat,
    lon: AppState.coords.lon,
    place_name: AppState.placeInfo.primaryName,
    city: AppState.placeInfo.city,
    state: AppState.placeInfo.state,
    country: AppState.placeInfo.country,
    custom_question: customQuestion,
    language: AppState.currentLanguage
  };

  try {
    const res = await fetch("/api/ai/analyze-place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody)
    });

    if (res.ok) {
      const data = await res.json();
      AppState.currentAiData = data;
      renderAiInsights(data);
    }
  } catch (err) {
    console.error("AI Place analysis error:", err);
  }
}

function renderAiInsights(data) {
  // Summary & Hindi Quote
  document.getElementById("aiPlaceSummary").textContent = data.summary || "Place details acquired.";
  if (data.hindi_announcement) {
    document.getElementById("aiHindiQuoteText").textContent = data.hindi_announcement;
  }

  // Famous Nearby & History
  const famousList = document.getElementById("aiFamousList");
  famousList.innerHTML = "";
  const items = (data.famous_nearby || []).concat(data.history_facts || []).slice(0, 4);
  items.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<i class="fa-solid fa-circle-check text-cyan"></i> <span>${item}</span>`;
    famousList.appendChild(li);
  });

  // Food Specialties
  const foodChips = document.getElementById("aiFoodChips");
  foodChips.innerHTML = "";
  (data.food_specialties || ["Local Street Delicacies", "Traditional Regional Sweets"]).forEach(f => {
    const span = document.createElement("span");
    span.className = "chip";
    span.innerHTML = `<i class="fa-solid fa-utensils"></i> ${f}`;
    foodChips.appendChild(span);
  });

  // Photo Tips
  if (data.photo_tips && data.photo_tips.length > 0) {
    document.getElementById("aiPhotoTip").querySelector("span").textContent = `Tip: ${data.photo_tips[0]}`;
  }

  // Travel Caption & Hashtags
  document.getElementById("aiTravelCaption").textContent = data.travel_caption || `Exploring ${AppState.placeInfo.primaryName}! 📍✨`;
  const hashtagsContainer = document.getElementById("aiHashtags");
  hashtagsContainer.innerHTML = "";
  (data.hashtags || ["#GPSMapCamera", "#TravelDiaries"]).forEach(tag => {
    const span = document.createElement("span");
    span.textContent = tag.startsWith("#") ? tag : `#${tag}`;
    hashtagsContainer.appendChild(span);
  });
}

function triggerCustomAiQuery(queryText) {
  if (!queryText || !queryText.trim()) return;
  fetchAiPlaceInsights(queryText.trim());
}

/* ===================================================================
   6. MAPS CONTROLLER (Leaflet MiniMap & Interactive Map)
   =================================================================== */
function initMaps() {
  const { lat, lon } = AppState.coords;

  // Custom Glowing Neon Map Marker
  const customIcon = L.divIcon({
    className: 'custom-gps-pin',
    html: `<div style="
      width: 18px; 
      height: 18px; 
      background: #00f2fe; 
      border: 3px solid #ffffff; 
      border-radius: 50%; 
      box-shadow: 0 0 12px #00f2fe;
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  // 1. Mini-Map inside the live watermark
  AppState.miniMap = L.map('stampMiniMap', {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false
  }).setView([lat, lon], 16);

  L.tileLayer(TILE_URLS.street, { maxZoom: 19 }).addTo(AppState.miniMap);
  AppState.miniMarker = L.marker([lat, lon], { icon: customIcon }).addTo(AppState.miniMap);

  // 2. Main Interactive Map inside AI pane
  AppState.mainMap = L.map('mainInteractiveMap', {
    zoomControl: true,
    attributionControl: true
  }).setView([lat, lon], 15);

  AppState.tileLayers.street = L.tileLayer(TILE_URLS.street, { maxZoom: 19 });
  AppState.tileLayers.satellite = L.tileLayer(TILE_URLS.satellite, { maxZoom: 19 });
  AppState.tileLayers.dark = L.tileLayer(TILE_URLS.dark, { maxZoom: 19 });

  AppState.tileLayers.street.addTo(AppState.mainMap);
  AppState.mainMarker = L.marker([lat, lon], { icon: customIcon }).addTo(AppState.mainMap);

  // Map Click to reposition/test any place worldwide
  AppState.mainMap.on('click', (e) => {
    const clickedLat = e.latlng.lat;
    const clickedLon = e.latlng.lng;
    AppState.coords.lat = clickedLat;
    AppState.coords.lon = clickedLon;
    updateMapPins(clickedLat, clickedLon);
    updateTelemetryUI();
    fetchReverseGeocode(clickedLat, clickedLon, true);
  });
}

function updateMapPins(lat, lon) {
  if (AppState.miniMap && AppState.miniMarker) {
    AppState.miniMap.setView([lat, lon], 16);
    AppState.miniMarker.setLatLng([lat, lon]);
    AppState.miniMap.invalidateSize();
  }
  if (AppState.mainMap && AppState.mainMarker) {
    AppState.mainMarker.setLatLng([lat, lon]);
  }
}

function switchMapLayer(layerName) {
  if (!AppState.tileLayers[layerName]) return;
  
  // Remove existing
  Object.values(AppState.tileLayers).forEach(layer => AppState.mainMap.removeLayer(layer));
  
  // Add new
  AppState.tileLayers[layerName].addTo(AppState.mainMap);
  AppState.currentTileLayer = layerName;

  document.querySelectorAll(".map-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.maplayer === layerName);
  });
}

/* ===================================================================
   7. PHOTO CAPTURE & WATERMARK CANVAS ENGINE
   =================================================================== */
async function capturePhotoWithWatermark() {
  const video = document.getElementById("cameraVideo");
  const canvas = document.getElementById("bakingCanvas");
  const ctx = canvas.getContext("2d");

  // Determine resolution (from live video or default high-res 1920x1080)
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  canvas.width = width;
  canvas.height = height;

  // 1. Draw Camera Frame
  if (video.videoWidth > 0) {
    ctx.drawImage(video, 0, 0, width, height);
  } else {
    // Generate realistic simulated camera scenery
    drawSimulatedCameraScenery(ctx, width, height);
  }

  // 2. Bake Selected Watermark Template
  await bakeWatermarkOnCanvas(ctx, width, height, AppState.template);

  // 3. Export high quality JPEG data URL
  const photoDataUrl = canvas.toDataURL("image/jpeg", 0.95);

  // 4. Save to gallery & open Preview Modal
  const photoRecord = {
    id: `photo_${Date.now()}`,
    dataUrl: photoDataUrl,
    placeName: AppState.placeInfo.primaryName,
    address: AppState.placeInfo.fullAddress,
    lat: AppState.coords.lat,
    lon: AppState.coords.lon,
    template: AppState.template,
    timestamp: new Date().toLocaleString()
  };

  savePhotoLocally(photoRecord);
  sendPhotoToServer(photoRecord);
  showPhotoPreview(photoRecord);
}

/**
 * BAKES WATERMARK ONTO THE CAPTURED PHOTO CANVAS
 */
async function bakeWatermarkOnCanvas(ctx, width, height, template) {
  const { primaryName, fullAddress, latDms, lonDms } = AppState.placeInfo;
  const { altitude, accuracy } = AppState.coords;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  ctx.save();

  if (template === "classic") {
    // Classic GPS Camera Banner at the bottom
    const barHeight = Math.max(130, height * 0.16);
    ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
    ctx.fillRect(0, height - barHeight, width, barHeight);

    // Red top border line
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(0, height - barHeight, width, 4);

    // Title
    ctx.font = `bold ${Math.round(barHeight * 0.22)}px 'Outfit', sans-serif`;
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(primaryName, 24, height - barHeight + 36);

    // Address
    ctx.font = `${Math.round(barHeight * 0.13)}px 'Outfit', sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(truncateText(fullAddress, Math.round(width * 0.08)), 24, height - barHeight + 64);

    // Telemetry & Timestamp
    ctx.font = `500 ${Math.round(barHeight * 0.12)}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "#38bdf8";
    const telemetry = `LAT: ${latDms} | LON: ${lonDms} | ALT: ${altitude}m | ${dateStr} ${timeStr}`;
    ctx.fillText(telemetry, 24, height - barHeight + 94);

  } else if (template === "cyber") {
    // Cyber HUD Stamp
    const cardW = width * 0.75;
    const cardH = Math.max(140, height * 0.18);
    const cardX = (width - cardW) / 2;
    const cardY = height - cardH - 24;

    ctx.fillStyle = "rgba(5, 12, 22, 0.90)";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    roundRect(ctx, cardX, cardY, cardW, cardH, 8, true, true);

    ctx.font = `bold ${Math.round(cardH * 0.22)}px 'Rajdhani', sans-serif`;
    ctx.fillStyle = "#10b981";
    ctx.fillText(`TARGET: ${primaryName.toUpperCase()}`, cardX + 20, cardY + 36);

    ctx.font = `${Math.round(cardH * 0.13)}px 'Outfit', sans-serif`;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(truncateText(fullAddress, 70), cardX + 20, cardY + 66);

    ctx.font = `${Math.round(cardH * 0.12)}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "#34d399";
    ctx.fillText(`GEO-TELEMETRY: [${latDms}, ${lonDms}] ACC: ±${accuracy}m ALT: ${altitude}m`, cardX + 20, cardY + 96);
    ctx.fillText(`TIMESTAMP: ${dateStr} ${timeStr} | GPS-AI-CAM`, cardX + 20, cardY + 120);

  } else if (template === "minimal") {
    // Minimalist Corner Badge
    const pad = 24;
    const boxW = Math.min(width * 0.6, 500);
    const boxH = 70;
    const boxX = pad;
    const boxY = height - boxH - pad;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    roundRect(ctx, boxX, boxY, boxW, boxH, 20, true, false);

    ctx.font = `bold 18px 'Outfit', sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`📍 ${primaryName}`, boxX + 16, boxY + 30);

    ctx.font = `12px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "#00f2fe";
    ctx.fillText(`${latDms}, ${lonDms} • ${dateStr}`, boxX + 16, boxY + 52);

  } else {
    // Default: Modern Glass Template
    const margin = 24;
    const cardW = width - (margin * 2);
    const cardH = Math.max(130, height * 0.17);
    const cardX = margin;
    const cardY = height - cardH - margin;

    // Glass backdrop
    ctx.fillStyle = "rgba(10, 14, 23, 0.85)";
    ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
    ctx.lineWidth = 2;
    roundRect(ctx, cardX, cardY, cardW, cardH, 16, true, true);

    // Left Accent Bar
    ctx.fillStyle = "#00f2fe";
    roundRect(ctx, cardX + 16, cardY + 18, 6, cardH - 36, 3, true, false);

    const textX = cardX + 36;
    
    // Primary Place Name
    ctx.font = `bold ${Math.round(cardH * 0.22)}px 'Outfit', sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`📍 ${primaryName}`, textX, cardY + Math.round(cardH * 0.32));

    // Full Address
    ctx.font = `${Math.round(cardH * 0.13)}px 'Outfit', sans-serif`;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(truncateText(fullAddress, Math.round(width * 0.08)), textX, cardY + Math.round(cardH * 0.56));

    // Telemetry & Date
    ctx.font = `500 ${Math.round(cardH * 0.12)}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "#00f2fe";
    const teleStr = `GPS: ${latDms}, ${lonDms}  |  ALT: ${altitude}m  |  ${dateStr} ${timeStr}`;
    ctx.fillText(teleStr, textX, cardY + Math.round(cardH * 0.82));
  }

  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function truncateText(str, maxChars) {
  if (!str) return "";
  return str.length > maxChars ? str.substring(0, maxChars - 3) + "..." : str;
}

function drawSimulatedCameraScenery(ctx, width, height) {
  // Vibrant gradient landscape
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(0.5, "#1e293b");
  grad.addColorStop(1, "#0369a1");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Geometric city silhouettes
  ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
  for (let i = 0; i < width; i += 80) {
    const bHeight = 120 + Math.sin(i) * 60;
    ctx.fillRect(i, height - bHeight - 140, 70, bHeight);
  }
}

/* ===================================================================
   8. PHOTO PREVIEW & SHARING MODAL
   =================================================================== */
function showPhotoPreview(record) {
  const modal = document.getElementById("photoPreviewModal");
  const img = document.getElementById("previewModalImg");
  const placeText = document.getElementById("previewPlaceName");
  const addrText = document.getElementById("previewAddress");

  img.src = record.dataUrl;
  placeText.textContent = record.placeName;
  addrText.textContent = record.address;

  modal.style.display = "flex";

  // Setup Download Action
  document.getElementById("downloadPhotoBtn").onclick = () => {
    const link = document.createElement("a");
    link.download = `GPS_Photo_${record.placeName.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
    link.href = record.dataUrl;
    link.click();
  };

  // Setup AI Vision Scan on captured photo
  document.getElementById("aiScanCapturedBtn").onclick = () => {
    analyzeImageWithAi(record.dataUrl);
    modal.style.display = "none";
    switchPaneTab("tabAiTool");
  };

  // Setup Web Share
  document.getElementById("sharePhotoBtn").onclick = async () => {
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(record.dataUrl)).blob();
        const file = new File([blob], "gps_camera_photo.jpg", { type: "image/jpeg" });
        await navigator.share({
          title: `GPS Map Camera - ${record.placeName}`,
          text: `Captured at ${record.placeName} (${record.address}) with GPS Map Camera!`,
          files: [file]
        });
      } catch (e) {
        console.warn("Share cancelled or failed:", e);
      }
    } else {
      // Fallback: Copy link/notice
      alert("Photo download link ready. Tap 'Download Photo' to save.");
    }
  };
}

async function analyzeImageWithAi(imageBase64) {
  const summaryEl = document.getElementById("aiPlaceSummary");
  summaryEl.textContent = "Analyzing captured photo with AI Vision...";

  try {
    const res = await fetch("/api/ai/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: imageBase64,
        lat: AppState.coords.lat,
        lon: AppState.coords.lon,
        place_name: AppState.placeInfo.primaryName,
        language: "hi"
      })
    });

    if (res.ok) {
      const data = await res.json();
      summaryEl.textContent = data.description || "Scene analysis completed.";
      if (data.travel_caption) {
        document.getElementById("aiTravelCaption").textContent = data.travel_caption;
      }
      if (data.hashtags) {
        const wrap = document.getElementById("aiHashtags");
        wrap.innerHTML = "";
        data.hashtags.forEach(tag => {
          const span = document.createElement("span");
          span.textContent = tag.startsWith("#") ? tag : `#${tag}`;
          wrap.appendChild(span);
        });
      }
      if (data.voice_summary && AppState.autoVoiceEnabled) {
        const utt = new SpeechSynthesisUtterance(data.voice_summary);
        utt.lang = AppState.voiceLanguage;
        AppState.speechSynth.speak(utt);
      }
    }
  } catch (e) {
    console.error("AI Image analysis error:", e);
  }
}

/* ===================================================================
   9. GALLERY & STORAGE
   =================================================================== */
function savePhotoLocally(record) {
  AppState.capturedPhotos.unshift(record);
  if (AppState.capturedPhotos.length > 30) AppState.capturedPhotos.pop();

  try {
    localStorage.setItem("geocam_photos", JSON.stringify(AppState.capturedPhotos.slice(0, 10)));
  } catch (e) {
    console.warn("LocalStorage full, keeping in-memory.");
  }

  updateGalleryUI();
}

function loadSavedPhotos() {
  try {
    const saved = localStorage.getItem("geocam_photos");
    if (saved) {
      AppState.capturedPhotos = JSON.parse(saved);
      updateGalleryUI();
    }
  } catch (e) {
    console.warn("Error loading saved photos:", e);
  }
}

function updateGalleryUI() {
  const count = AppState.capturedPhotos.length;
  document.getElementById("galleryCount").textContent = count;
  document.getElementById("galleryTotalBadge").textContent = `${count} Photos`;

  if (count > 0) {
    document.getElementById("lastPhotoThumb").src = AppState.capturedPhotos[0].dataUrl;
  }

  const grid = document.getElementById("galleryGrid");
  if (count === 0) return;

  grid.innerHTML = "";
  AppState.capturedPhotos.forEach(item => {
    const card = document.createElement("div");
    card.className = "gallery-card-item";
    card.innerHTML = `
      <img src="${item.dataUrl}" alt="${item.placeName}">
      <div class="gallery-item-info">
        <p class="gallery-item-title">${item.placeName}</p>
        <span class="gallery-item-time">${item.timestamp}</span>
      </div>
    `;
    card.onclick = () => showPhotoPreview(item);
    grid.appendChild(card);
  });
}

async function sendPhotoToServer(record) {
  try {
    await fetch("/api/save-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: record.dataUrl,
        lat: record.lat,
        lon: record.lon,
        place_name: record.placeName,
        address: record.address,
        template: record.template,
        timestamp: record.timestamp
      })
    });
  } catch (e) {
    console.warn("Server save error:", e);
  }
}

/* ===================================================================
   10. UI EVENT LISTENERS & NAVIGATION
   =================================================================== */
function initUIEventListeners() {
  // Language Switcher Toggle (Hindi / English)
  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      const nextLang = AppState.currentLanguage === "hi" ? "en" : "hi";
      applyLanguage(nextLang);
    });
  }

  // Shutter Capture
  document.getElementById("capturePhotoBtn").addEventListener("click", capturePhotoWithWatermark);
  
  // Camera Controls
  document.getElementById("switchCameraBtn").addEventListener("click", switchCamera);
  document.getElementById("toggleTorchBtn").addEventListener("click", toggleTorch);
  document.getElementById("toggleGridBtn").addEventListener("click", toggleGrid);

  // Template Change
  const templateSelect = document.getElementById("templateSelect");
  templateSelect.addEventListener("change", (e) => {
    setWatermarkTemplate(e.target.value);
  });

  // Voice Announce Button
  document.getElementById("speakPlaceNameBtn").addEventListener("click", speakPlaceName);
  document.getElementById("micVoiceQuestionBtn").addEventListener("click", toggleVoiceRecognition);

  // Auto Voice Header Toggle
  const autoVoiceBtn = document.getElementById("autoVoiceToggleBtn");
  autoVoiceBtn.addEventListener("click", () => {
    AppState.autoVoiceEnabled = !AppState.autoVoiceEnabled;
    autoVoiceBtn.dataset.active = AppState.autoVoiceEnabled;
    autoVoiceBtn.querySelector(".btn-text").textContent = `Voice: ${AppState.autoVoiceEnabled ? 'ON' : 'OFF'}`;
  });

  // Pane Tabs Switcher
  document.querySelectorAll(".pane-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      switchPaneTab(tab.dataset.target);
    });
  });

  // Map Controls
  document.querySelectorAll(".map-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchMapLayer(btn.dataset.maplayer);
    });
  });

  document.getElementById("recenterMapBtn").addEventListener("click", () => {
    if (AppState.mainMap) {
      AppState.mainMap.setView([AppState.coords.lat, AppState.coords.lon], 16);
    }
  });

  // Gallery Open
  document.getElementById("openGalleryBtn").addEventListener("click", () => {
    switchPaneTab("tabGallery");
  });

  // Quick AI Scan Live Button
  document.getElementById("quickAnalyzeLiveBtn").addEventListener("click", () => {
    const video = document.getElementById("cameraVideo");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    analyzeImageWithAi(canvas.toDataURL("image/jpeg", 0.8));
    switchPaneTab("tabAiTool");
  });

  // Manual location setter
  const manualLocationInput = document.getElementById("manualLocationInput");
  document.getElementById("submitLocationBtn").addEventListener("click", () => {
    applyManualLocation(manualLocationInput.value);
  });
  manualLocationInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") applyManualLocation(e.target.value);
  });

  document.getElementById("voiceSetLocationBtn").addEventListener("click", () => {
    if (!AppState.speechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const isListening = AppState.isListening;
    if (isListening) {
      AppState.speechRecognition.stop();
      AppState.isListening = false;
      return;
    }

    AppState.speechRecognition.lang = AppState.voiceLanguage;
    AppState.speechRecognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      manualLocationInput.value = spokenText;
      applyManualLocation(spokenText);
    };
    AppState.speechRecognition.start();
    AppState.isListening = true;
  });

  // Custom AI Query
  document.getElementById("sendCustomQueryBtn").addEventListener("click", () => {
    const input = document.getElementById("customAiQueryInput");
    triggerCustomAiQuery(input.value);
  });
  document.getElementById("customAiQueryInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") triggerCustomAiQuery(e.target.value);
  });

  // Refresh AI
  document.getElementById("refreshAiBtn").addEventListener("click", () => {
    fetchAiPlaceInsights();
  });

  // Copy Caption
  document.getElementById("copyCaptionBtn").addEventListener("click", () => {
    const caption = document.getElementById("aiTravelCaption").textContent;
    const tags = Array.from(document.getElementById("aiHashtags").children).map(c => c.textContent).join(" ");
    navigator.clipboard.writeText(`${caption}\n\n${tags}`);
    alert("Caption & Hashtags copied to clipboard!");
  });

  // Modals Close
  document.getElementById("closePreviewBtn").addEventListener("click", () => {
    document.getElementById("photoPreviewModal").style.display = "none";
  });
  document.getElementById("closeSettingsBtn").addEventListener("click", () => {
    document.getElementById("settingsModal").style.display = "none";
  });
  document.getElementById("openSettingsBtn").addEventListener("click", () => {
    document.getElementById("settingsModal").style.display = "flex";
  });

  // Settings Save
  document.getElementById("saveSettingsBtn").addEventListener("click", () => {
    AppState.geminiApiKey = document.getElementById("geminiApiKeyInput").value.trim();
    AppState.voiceLanguage = document.getElementById("voiceLanguageSelect").value;
    AppState.autoVoiceEnabled = document.getElementById("autoVoiceCheckbox").checked;
    const defaultTemplate = document.getElementById("defaultTemplateSelect").value;
    setWatermarkTemplate(defaultTemplate);
    document.getElementById("templateSelect").value = defaultTemplate;

    localStorage.setItem("geocam_gemini_key", AppState.geminiApiKey);
    localStorage.setItem("geocam_voice_lang", AppState.voiceLanguage);
    localStorage.setItem("geocam_auto_voice", AppState.autoVoiceEnabled);
    localStorage.setItem("geocam_template", defaultTemplate);

    document.getElementById("settingsModal").style.display = "none";
    alert("Settings saved successfully!");
  });
}

function switchPaneTab(tabId) {
  document.querySelectorAll(".pane-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.target === tabId);
  });
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.id === tabId);
  });

  // Leaflet map needs resize invalidate when tab unhides
  if (tabId === "tabLiveMap" && AppState.mainMap) {
    setTimeout(() => AppState.mainMap.invalidateSize(), 150);
  }
}

function setWatermarkTemplate(templateName) {
  AppState.template = templateName;
  const overlay = document.getElementById("liveWatermarkOverlay");
  overlay.className = `watermark-overlay template-${templateName}`;
}

function startLiveClock() {
  const clockEl = document.getElementById("stampDateTime");
  setInterval(() => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-IN', { hour12: true });
  }, 1000);
}

function loadSavedSettings() {
  try {
    const key = localStorage.getItem("geocam_gemini_key");
    const lang = localStorage.getItem("geocam_voice_lang");
    const appLang = localStorage.getItem("geocam_lang");
    const voice = localStorage.getItem("geocam_auto_voice");
    const tmpl = localStorage.getItem("geocam_template");

    if (appLang) {
      AppState.currentLanguage = appLang;
      applyLanguage(appLang);
    }
    if (key) {
      AppState.geminiApiKey = key;
      document.getElementById("geminiApiKeyInput").value = key;
    }
    if (lang) {
      AppState.voiceLanguage = lang;
      document.getElementById("voiceLanguageSelect").value = lang;
    }
    if (voice !== null) {
      AppState.autoVoiceEnabled = voice === "true";
      document.getElementById("autoVoiceCheckbox").checked = AppState.autoVoiceEnabled;
      const btn = document.getElementById("autoVoiceToggleBtn");
      btn.dataset.active = AppState.autoVoiceEnabled;
      btn.querySelector(".btn-text").textContent = `Voice: ${AppState.autoVoiceEnabled ? 'ON' : 'OFF'}`;
    }
    if (tmpl) {
      setWatermarkTemplate(tmpl);
      document.getElementById("templateSelect").value = tmpl;
      document.getElementById("defaultTemplateSelect").value = tmpl;
    }
  } catch (e) {
    console.warn("Settings load error:", e);
  }
}
