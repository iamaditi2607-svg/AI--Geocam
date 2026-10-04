# 📍 GPS Map Camera - AI Vision & Smart Geotagging

एक आधुनिक, हाई-टेक **GPS Map Camera** एप्लीकेशन जिसमें **AI Assistant**, **Real-Time Reverse Geocoding**, **Bilingual Voice Place Announcer** (हिंदी और English दोनों भाषाओं में जगह का नाम बोलकर सुनाना), और **Live Photo Watermarking** शामिल है।

---

## ✨ Features (मुख्य विशेषताएं)

1. **🌐 Bilingual Support (हिंदी और English दोनों)**:
   - Header me **`🌐 हिंदी / English`** ka 1-click button diya gaya hai.
   - Button dabate hi poora UI, buttons, tabs, AI ke saare descriptions, aur **Voice Speaker** turant chuni hui bhasha (Hindi ya English) me switch ho jata hai!
   - **Hindi Mode**: *"आप अभी [जगह का नाम], [शहर] पर खड़े हैं।"*
   - **English Mode**: *"You are currently standing at [Place Name], [City]."*

2. **Animated Splash Screen ("GPS MAP CAMERA")**:
   - App open hote hi glowing radar sweep aur camera lens aperture ke saath stylish **"GPS MAP CAMERA"** likh kar aayega aur satellite lock animate hoga.

3. **Dual-Pane Interface (GPS Camera + AI Tool ek sath)**:
   - Screen ke ek taraf **Live GPS Camera Viewfinder** khula rahega.
   - Doosri taraf **AI Assistant** aur **Interactive Leaflet Map** sath me active rahenge.

4. **Auto Place Name Detection & Voice Announcer**:
   - Jaise hi GPS location milti hai, app turant exact jagah (Colony/Road/Landmark, City, State) detect kar leta hai.
   - **Voice Speaker Button ("Jagah Ka Naam Boliye 🔊 / Announce Place")**: Click karte hi ya automatically chuni hui bhasha me bolkar sunata hai.
   - **Voice Mic**: Mic button daba kar aap voice me sawal bhi puch sakte hain (*"Yeh kaun si jagah hai?", "Yahan kya famous hai?"*).

5. **Professional Photo Watermarking**:
   - Photo snap karte hi image par automatic stamp bake ho jata hai:
     - Exact Place Name
     - Full Detailed Address
     - Live Latitude & Longitude (DMS format me: e.g. `28°37'50"N, 77°12'32"E`)
     - Altitude & Accuracy
     - Live Mini-Map thumbnail
     - Live Date & Time
   - **4 Stamp Templates**: Modern Glass, Classic GPS, Cyber HUD, Minimalist.
   - 1-Click Download JPG & Share.

6. **AI Vision & Travel Guide**:
   - **AI Overview**: Wahan ka historical importance aur context.
   - **Nearby Spots**: Aas-paas ke famous tourist landmarks aur monuments.
   - **Local Food**: Wahan ka famous street food aur snacks.
   - **Instagram Caption Generator**: Ready-to-use captions with emojis aur trending hashtags.

7. **Interactive Live Map**:
   - Street View, Satellite View aur Dark Mode.
   - Map par kahin bhi tap karke pin move karein aur duniya ke kisi bhi kone ka watermark test karein.

---

## 🚀 How to Run (App Kaise Chalayein)

### Option 1: 1-Click Launcher (Sabse Aasan)
Project folder me `start_app.bat` par **Double Click** karein!
Server start ho jayega aur browser me app automatically khul jayega:
👉 **http://localhost:8000**

*(Agar aap PowerShell prefer karte hain, toh `start_app.ps1` par Right-Click karke **"Run with PowerShell"** bhi kar sakte hain).*

### Option 2: Terminal / VS Code se
```powershell
.\backend\venv\Scripts\python.exe run.py
```

---

## 💻 VS Code me Files ke baare me:
- Pehle Python `venv` folder ke andar ki system files (jaise `__init__.py` aur `py.typed`) 0-byte dikh rahi thi jisse lag raha tha files khali hain.
- Ab humne `.vscode/settings.json` add kar diya hai jisse internal `venv` background me configure ho gaya hai aur VS Code ke sidebar me ab sirf aapki real project files dikhengi:
  - `backend/main.py`
  - `frontend/index.html`
  - `frontend/app.js`
  - `frontend/style.css`
  - `run.py`
  - `start_app.bat`

---

## 📱 Mobile Phone par kaise chalayein:
Mobile phone par real GPS aur camera test karne ke liye:
1. Laptop aur Mobile ek hi Wi-Fi / Hotspot se connect karein.
2. Terminal me jo **Mobile Phone URL** dikhe (Jaise `http://192.168.1.X:8000`), use apne phone ke Chrome/Safari browser me kholein.
3. Camera aur Location permission allow karein!
