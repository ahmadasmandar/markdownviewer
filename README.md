# Markdown Viewer AA

A professional, high-performance, and secure Markdown Viewer desktop application for Windows. Designed for clean reading, LaTeX math processing, syntax-highlighted code blocks, and pixel-perfect PDF/HTML exports.

## Key Features

- 📖 **Clean Reading Mode:** Clean screen presentation supporting standard Markdown elements (headings, tables, lists, links, inline code, and relative image path resolution).
- 🗂️ **Multi-Tab Support:** Open, read, and manage multiple files simultaneously in a tabbed interface. Tabs persist their zoom factors independently.
- 📐 **LaTeX Math Support:** Native processing of inline equations (`$...$`) and block math (`$$...$$`) via **KaTeX**.
- 🎨 **Modern Comfort Dark Theme:** Custom space-indigo comfort dark palette designed to reduce eye strain, featuring pleasant syntax coloring for code blocks.
- 🔢 **Code Block Line Numbers:** Code blocks render inside modern two-column layouts featuring line numbers styled to not get selected when highlighting and copying code.
- 📋 **Copy Code Button:** Hovering over any code block reveals an intuitive "Copy Code" button to quickly copy clean raw code to the clipboard.
- 🌓 **Theme Toggle:** Easily switch between light and dark modes.
- 🔍 **Interactive Zoom:** Live zoom slider/buttons in the toolbar (from 50% to 200%) to scale text smoothly on high-resolution displays.
- ⚡ **Batch PDF Converter:** Select multiple Markdown files and convert them to styled PDFs in the background. You can select any output directory (defaults to creating a `documentaion_md` folder alongside your source files).
- 💾 **Professional Exports:**
  - **Export to PDF:** Automatically targets A4 format with small margins (0.4in) and forces a print-optimized high-contrast light stylesheet (preventing dark background printing) with clean wrapped text (no cutoff content or scrollbars).
  - **Export to HTML:** Generates a standalone, fully self-contained HTML file embedding all required styles.
- 📂 **Auto-Reveal in Folder:** Opening target directories automatically in Windows Explorer upon successful PDF/HTML export.
- 🖱️ **Drag & Drop:** Drag and drop `.md` or `.markdown` files directly into the window to open them in tabs.
- 🛠️ **Windows Context Menu ("Open with"):** Integrated single-instance locks and command-line parsing to enable double-clicking files or right-clicking to open directly inside tabs.
- 🖱️ **Right-Click Context Menu:** Convenient standard copy, select all, zoom, and export options.
- 🔒 **Security First:** Sandboxed processes, strict context isolation, and disabled Node.js integration inside the renderer window.

---

## Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org) (v18 or higher) installed on your system.

### Installation

Clone the repository and install the dependencies:

```powershell
# Install npm dependencies
npm.cmd install
```

---

## Commands

### Run in Development

Runs the compiler and launches the Electron application locally:

```powershell
npm.cmd run dev
```

### Run Tests

Executes unit tests and equation processing checks:

```powershell
npm.cmd run test
```

### Build and Package Standalone `.exe`

Packages the application into a single standalone portable `.exe` executable under the `release/` folder (with embedded custom icon metadata):

```powershell
npm.cmd run package
```

---

## Folder Structure

```
├── dist/                   # Compiled TypeScript / Vite assets
├── release/                # Compiled portable Windows binary (.exe)
├── src/
│   ├── main/               # Electron Main Process script
│   ├── preload/            # Context Bridge Preload script
│   └── renderer/           # Frontend Vite application (HTML, CSS, TS)
├── tests/                  # Unit and integration test suites
├── markdown.png            # Application custom icon
├── package.json            # Configuration and script pipelines
└── tsconfig.json           # TypeScript configuration
```

---

## License

This project is licensed under the **MIT License** — free to use, modify, and distribute as open-source software.

## Author

**Ahmad Asmandar**

* Email: [ahmedasmnr2@gmail.com](mailto:ahmedasmnr2@gmail.com)
* GitHub: [Ahmad Asmandar](https://github.com/Ahmad-Asmandar)

# markdownviewer
