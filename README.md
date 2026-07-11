## Live Demo

Try the project here:  
https://personal-art-gallery.vercel.app

# Personal Art Gallery

Personal Art Gallery is a local-first, web-based 3D virtual gallery project. It allows users to upload their own images, arrange them across gallery walls, and explore the exhibition space through free orbit navigation.

The project supports gallery theme switching, wall surface styling, floor material customization, artwork frame styling, editable artwork descriptions, background music playback, gallery configuration save/export/import, and clean PNG snapshot export.

Instead of being a simple image viewer, Personal Art Gallery aims to provide a customizable and more curatorial way to present personal visual collections.


---

## Preview

> Add screenshots or demo GIF here.

```txt
[Homepage Screenshot]
[3D Gallery Screenshot]
[Artwork Detail Panel Screenshot]
[Snapshot Export Example]
```

---

## Features

### Artwork Upload

Users can upload 1–15 image files and generate a personal 3D gallery space.

Supported image formats depend on browser support, including common formats such as JPG, PNG, and WebP.

---

### 3D Gallery Exploration

The gallery supports free orbit navigation and zoom, allowing users to explore the exhibition space from different angles.

Users can view artworks across multiple gallery walls in a simple virtual exhibition room.

---

### Gallery Themes

Users can switch between multiple gallery themes:

* White Gallery
* Black Museum
* Warm Gallery
* Minimal Box

Each theme changes the overall atmosphere of the gallery space.

---

### Wall Surface Styling

Users can customize wall styles globally or individually.

Supported wall targets:

* All Walls
* Front Wall
* Left Wall
* Right Wall

Wall style presets include:

* Pure White
* Warm Beige
* Soft Concrete
* Minimal Gray
* Subtle Wallpaper
* Panel Wall

---

### Floor Material Styling

Users can switch floor material presets to adjust the visual tone of the exhibition space.

Available floor styles include:

* Light Wood
* Dark Wood
* Polished Concrete
* Stone Tile
* Warm Matte
* Black Museum Floor

---

### Artwork Frame Styling

Users can apply different frame styles to all artworks.

Frame style presets include:

* Thin Black
* Thin White
* Natural Wood
* Bronze
* Gold Trim
* Shadow Frame

---

### Artwork Detail Panel

Clicking an artwork opens a refined detail panel with:

* Large artwork preview
* Artwork information
* Metadata tags
* Curator-style note
* Artwork index

This turns the gallery from a simple image viewer into a more personal curatorial space.

---

### Editable Artwork Descriptions

Users can edit and save descriptions for each artwork.

Descriptions can be restored through saved gallery configuration when matching filenames are re-uploaded.

---

### Background Music Player

Users can upload their own local audio file and play it as background music while exploring the gallery.

The music player supports:

* Local audio upload
* Play / pause
* Volume control
* Display of the selected audio filename

Audio files are used locally in the browser. They are not uploaded or stored online.

---

### Gallery Configuration Save / Export / Import

Users can save, export, import, and reset gallery configurations.

The saved configuration may include:

* Selected gallery theme
* Wall styles
* Floor material
* Frame style
* Artwork descriptions
* Artwork filename references
* Version and creation timestamp

The app does not store image or audio binary data in the configuration file.

This keeps exported configuration files lightweight and privacy-friendly.

---

### Refresh Recovery

Because browsers do not allow local image files to be automatically restored after refresh, the app handles this limitation gracefully.

If saved settings exist but uploaded image files are missing after refresh, the app prompts users to re-upload images.

When filenames match, saved descriptions and gallery settings can be restored.

---

### Snapshot Export

Users can export the current 3D gallery view as a clean PNG image.

The exported snapshot reflects:

* Current camera angle
* Current zoom level
* Current theme
* Wall styles
* Floor material
* Frame style
* Displayed artworks

The exported image does not include the browser UI or control panels.

---

## Local-First Design

Personal Art Gallery is designed as a local-first prototype.

It does not require:

* User accounts
* Cloud storage
* Backend database
* Public share links
* Online image hosting
* Online audio hosting

Images and audio files are handled locally in the browser during the current session.

---

## Tech Stack

* React
* TypeScript
* Three.js
* Vite
* HTML / CSS

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd personal-art-gallery
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Then open the local development URL shown in the terminal.

---

## Project Structure

```txt
Personal Art Gallery
├── src
│   ├── pages
│   │   └── GalleryPage.tsx
│   ├── themes
│   ├── surfaces
│   ├── config
│   └── ...
├── package.json
├── vite.config.ts
└── README.md
```

The exact folder structure may vary as the project evolves.

---

## Current Version

### v2.0 Portfolio Release

Current major features:

* Artwork upload
* 3D gallery generation
* Free orbit exploration
* Gallery theme switching
* Wall / floor / frame styling
* Artwork detail panel
* Editable artwork descriptions
* Background music player
* Gallery configuration save / export / import
* Snapshot export

---

## Future Improvements

Potential future directions:

* User-uploaded wall or floor textures
* Per-artwork frame customization
* More advanced gallery layout controls
* Public share links
* Cloud-based gallery publishing
* Guided exhibition mode
* Mobile layout optimization
* More refined 3D lighting and material presets

---

## Notes

This project is a portfolio prototype focused on interaction design, product thinking, and AI-assisted front-end development.

It is not intended to be a full commercial gallery platform yet.

---

## License

Add license information here.
