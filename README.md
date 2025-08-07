# GPS Overlay Toolkit

**GPS Overlay Toolkit** is a lightweight, browser-based suite of tools for working with GPX files and converting them into video-friendly overlays. Built for mountain biking and action sports, the toolkit is especially helpful for creators using **DaVinci Resolve** to visualize real-time GPS movement on screen.

## 🌍 Tools Included

### 📌 GPX to SVG/SPL Converter
- Converts `.gpx` files to:
  - **SVG** route overlays
  - **SPL** timing files compatible with DaVinci Resolve
- Customize:
  - Path color, thickness, drop shadow, and offset
  - Frame rate
- Real-time preview before download

### ✂️ GPX Trimmer Tool
- Visually trims the start and end of a GPX track
- Live map preview using Leaflet
- Export the cleaned `.gpx` file

---

## 📂 Project Structure

```
GPX Suite Website - Rev 0
├─ GPX 2 SVG and SPL
│  ├─ gpx-svg-spl-script.js
│  ├─ gpx-svg-spl-styles.css
│  └─ gpx-svg-spl.html
├─ GPX Trimmer
│  ├─ gpx-trimmer-script.js
│  ├─ gpx-trimmer-styles.css
│  └─ gpx-trimmer.html
├─ images
│  ├─ YouTube Banner.png
│  └─ youtube-icon.png
├─ Main Page
│  ├─ index.html
│  └─ main-page-styles.css
└─ README.md
```

---

## 🚀 Getting Started

1. Clone or download the repo
2. Open `Main Page/index.html` in your browser
3. Use the tools directly – no installation or internet required (except for map tiles in the Trimmer)

---

## 🎬 Use Case: Mountain Biking
Originally designed to overlay GPS tracks on MTB videos recorded with a GoPro, this toolkit allows riders to:
- Trim out parking lot/road sections
- Customize visuals to match their video aesthetic
- Create high-quality overlays synced to frame rate

---

## 📃 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙋 Support

If you encounter issues or want to request features:
- Leave a comment on the YouTube channel: [Bikes with Ben](https://www.youtube.com/@bikes-with-ben)
