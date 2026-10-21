# Obsidian Pandoc Typst PDF Export

An Obsidian plugin paired with a custom Typst academic template that exports your Markdown notes into clean, publication-ready, two-column academic PDFs using **Pandoc** and **Typst**.

---

## Features

### 1. Academic Typst PDF Template (`template.typ`)
- **Two-Column Layout**: Tight, minimal margins and column gutter (~12pt) designed like an academic paper.
- **Full-Width Title**: Document title spans across both columns on the first page, styled at **32pt**.
- **Table of Contents**: Prominently formatted across the top of the document prior to the multi-column text.
- **Custom Color Palette**:
  - Background: Pure white.
  - Body Text: Black at **10pt**.
  - Headings: Navy Blue (`#002060`) with strict 2pt decrements:
    - **H1**: 24pt
    - **H2**: 22pt
    - **H3**: 20pt
    - **H4**: 18pt
    - **H5**: 16pt
    - **H6**: 14pt
  - Bold Text: Styled in bold with a dirty yellow / mustard accent (`#B58900`) for high contrast and readability.
- **Running Footer (8pt)**:
  - Generation timestamp (`YYYY-MM-DD HH:mm:ss`) in the bottom-left corner.
  - Page numbers in the bottom-right corner.

### 2. Lightweight Obsidian Plugin
- **Command Palette Action**: Simply run `pandoc typst export pdf` (`Cmd/Ctrl + P`).
- **Obsidian Syntax Resolution**:
  - Resolves `[[wikilinks]]` and `[[wikilinks|custom alias]]` into clean text.
  - Resolves vault embedded images (`![[image.png]]` or `![[image.png|width]]`) to absolute filesystem paths so Pandoc and Typst embed them seamlessly.
- **Configurable Output Destination**: Saves PDFs into a dedicated vault folder (defaults to `exports/`).
- **macOS PATH Resolution**: Automatically augments `PATH` (`/usr/local/bin`, `/opt/homebrew/bin`, `~/.cargo/bin`) so the plugin finds `pandoc` and `typst` in GUI Electron environments without manual setup.

---

## Prerequisites

Make sure **Pandoc** (version 3.0 or higher) and **Typst** are installed on your machine:

```bash
# macOS (via Homebrew)
brew install pandoc typst
```

---

## Installation

1. Copy or clone this repository into your Obsidian vault's plugins folder:
   ```bash
   <VaultFolder>/.obsidian/plugins/pandoc-typst-export-pdf/
   ```
2. Ensure the following files are present in the plugin folder:
   - `manifest.json`
   - `main.js`
   - `template.typ`
3. Reload Obsidian (`Cmd/Ctrl + R`) or open **Settings -> Community Plugins**, enable Community Plugins, and toggle on **Pandoc Typst Export PDF**.

---

## Usage

1. Open any note in Obsidian.
2. Open the Command Palette (`Cmd/Ctrl + P`).
3. Type and select: `pandoc typst export pdf`.
4. A notification will appear, and the compiled PDF will be placed in your configured export folder (default: `exports/<NoteName>.pdf`).

---

## Settings

Go to **Settings -> Pandoc Typst PDF Export**:
- **Export Folder**: Vault directory for generated PDFs (default: `exports`).
- **Pandoc Path**: Path to the `pandoc` binary (default: `pandoc`).
- **Typst Path**: Path to the `typst` binary (default: `typst`).
- **Custom Typst Template Path**: (Optional) Specify an external `.typ` template file to override the bundled template.

---

## Development & Verification

Run the included verification suite:
```bash
npm test
```

Build from source:
```bash
npm run build
```
