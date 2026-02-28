# 🎮 PocketTranslate v0.0.1-Beta
**The Ultimate In-Browser ROM Translation & Hacking Suite**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.0.1--Beta-green.svg)
![Platform](https://img.shields.io/badge/platform-Web%20Browser-orange.svg)

PocketTranslate is a powerful, client-side web application designed to make retro game ROM translation (GBA, NDS, SNES, NES) accessible, visual, and seamless. By combining a hex editor, text extraction heuristics, and a live WebAssembly (WASM) emulator, you can translate games and see the results in real-time without leaving your browser.

No installations, no backend servers, no complex desktop setups. Everything runs locally in your browser!

---

## ✨ Key Features

* **⚡ Live Preview & Sync:** Powered by EmulatorJS (Libretro WASM). Edit a line of text, click "Apply & Sync," and instantly see the translated text inside the running game.
* **🧠 Auto-Relocation & Repointing (Cumulative):** Forget manual hex math! If your translated text is longer than the original, PocketTranslate automatically finds free space in the ROM, moves the text, and updates the game's internal pointers.
* **💾 Smart Save-State Integration:** Applying a patch while playing? The system automatically preserves your RAM state, ensuring you don't lose progress or glitch the game when syncing new texts.
* **🔤 Custom Table (`.tbl`) Support:** Load your own character mapping tables to handle games with custom, non-ASCII text encodings.
* **📦 DTE/MTE Handling:** Built-in support for Dual-Tile Encoding and Multi-Tile Encoding algorithms.
* **🛠️ Web Worker Architecture:** Heavy lifting (ROM rebuilding, heuristics, and hex searching) is offloaded to Web Workers, keeping the UI lightning-fast and responsive.

---

## 🚀 Getting Started (Local Setup)

Because PocketTranslate uses Web Workers and WebAssembly, it requires a local web server to bypass strict browser CORS policies. You cannot simply double-click the `index.html` file.

### Prerequisites
* [Node.js](https://nodejs.org/) (for `http-server`) OR Python (built-in) OR VSCode.

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/ikhwanketor/pocket-translate.git](https://github.com/ikhwanketor/pocket-translate.git)
   cd pocket-translate

    Serve the project locally:

        Option A (VSCode - Recommended): Install the Live Server extension, right-click pockettranslate_improved15.html, and select "Open with Live Server".

        Option B (Python): ```bash
        python -m http.server 8000

        Option C (Node.js): ```bash
        npx http-server -p 8000


    Open your browser:
    Navigate to http://localhost:8000/pockettranslate_improved15.html

📖 How to Use

    Load ROM: Click the upload button to load your target retro game ROM (.gba, .sfc, .nes, etc.).

    Load Table: Upload the .tbl file specific to the game to decode the gibberish hex into readable text.

    Translate: Browse the extracted text blocks in the left panel and type your translation.

    Live Sync: Press the Apply & Sync button. The app will rebuild the ROM in the background, repoint if necessary, and reload it directly into the side-by-side emulator.

🛠️ Tech Stack

    Frontend: HTML5, CSS3, React 18 (via CDN for zero-build setup)

    Heavy Processing: Vanilla JavaScript Web Workers

    Live Emulation: WebAssembly (WASM) via EmulatorJS

    Architecture: 100% Client-Side processing (No server-side uploads, keeping your ROMs private).

🤝 Contributing

Contributions, issues, and feature requests are welcome! If you are a reverse engineer, React dev, or UI designer, feel free to submit a Pull Request.
📜 License

This project is open-source and available under the MIT License.

Created with ❤️ for the Retro Gaming and Translation Community by IkhwanKetor.
