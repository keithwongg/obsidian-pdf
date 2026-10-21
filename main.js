var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PandocTypstPlugin,
  preprocessMarkdown: () => preprocessMarkdown
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var import_child_process = require("child_process");
var DEFAULT_SETTINGS = {
  exportFolder: "exports",
  pandocPath: "pandoc",
  typstPath: "typst",
  customTemplatePath: ""
};
function preprocessMarkdown(content, resolveVaultFile) {
  let frontmatter = "";
  let body = content;
  if (content.startsWith("---")) {
    const endIdx = content.slice(3).indexOf("\n---");
    if (endIdx !== -1) {
      const candidate = content.slice(3, 3 + endIdx);
      const lines = candidate.split("\n").filter((l) => l.trim().length > 0);
      const isLikelyYaml = lines.length === 0 || lines.every((l) => {
        const trimmed = l.trim();
        return trimmed.startsWith("#") || /^[a-zA-Z0-9_-]+(\[[^\]]*\])?\s*:/.test(trimmed) || /^\s*-\s+/.test(l);
      });
      if (isLikelyYaml) {
        const sanitizedLines = lines.map((line) => {
          return line.replace(/^(\s*[\w.-]+\s*:\s*)(\*|\&)([^\s\n]+.*)$/, '$1"$2$3"');
        });
        frontmatter = `---
${sanitizedLines.join("\n")}
---
`;
        body = content.slice(3 + endIdx + 4);
      }
    }
  }
  body = body.replace(/^([ \t]*-{3,}[ \t]*)$/gm, "***");
  body = body.replace(/!\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, linkPath, alias) => {
    const cleanLink = linkPath.trim();
    const resolvedPath = resolveVaultFile(cleanLink);
    if (!resolvedPath) return match;
    let altText = cleanLink.split("/").pop() || cleanLink;
    if (alias && !/^\d+(x\d+)?$/.test(alias.trim())) {
      altText = alias.trim();
    }
    return `![${altText}](${resolvedPath})`;
  });
  body = body.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, linkPath, alias) => {
    return alias ? alias.trim() : linkPath.trim();
  });
  return frontmatter + body;
}
var PandocTypstPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "pandoc-typst-export-pdf",
      name: "pandoc typst export pdf",
      checkCallback: (checking) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === "md") {
          if (!checking) {
            this.exportCurrentNote(activeFile);
          }
          return true;
        }
        return false;
      }
    });
    this.addSettingTab(new PandocTypstSettingTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  getVaultBasePath() {
    const adapter = this.app.vault.adapter;
    return adapter.basePath || (typeof adapter.getFullPath === "function" ? adapter.getFullPath("") : "");
  }
  getTemplatePath() {
    if (this.settings.customTemplatePath && fs.existsSync(this.settings.customTemplatePath)) {
      return this.settings.customTemplatePath;
    }
    const vaultBase = this.getVaultBasePath();
    const pluginTemplate = path.join(vaultBase, this.app.vault.configDir, "plugins", this.manifest.id, "template.typ");
    if (fs.existsSync(pluginTemplate)) {
      return pluginTemplate;
    }
    const localTemplate = path.join(__dirname, "template.typ");
    if (fs.existsSync(localTemplate)) {
      return localTemplate;
    }
    return pluginTemplate;
  }
  getProcessEnv() {
    const env = { ...process.env };
    const commonPaths = ["/usr/local/bin", "/opt/homebrew/bin", `${process.env.HOME}/.cargo/bin`];
    const currentPath = env.PATH || "";
    const missing = commonPaths.filter((p) => !currentPath.includes(p));
    if (missing.length > 0) {
      env.PATH = `${missing.join(":")}:${currentPath}`;
    }
    return env;
  }
  formatTimestamp(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  formatFileTimestamp(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }
  async exportCurrentNote(file) {
    new import_obsidian.Notice(`Exporting "${file.basename}" to PDF...`);
    const vaultBase = this.getVaultBasePath();
    const exportFolder = this.settings.exportFolder.trim() || "exports";
    if (!await this.app.vault.adapter.exists(exportFolder)) {
      await this.app.vault.createFolder(exportFolder);
    }
    const safeBaseName = file.basename.replace(/\s+/g, "_");
    const fileTimestamp = this.formatFileTimestamp(/* @__PURE__ */ new Date());
    const outputFileName = `${safeBaseName}_${fileTimestamp}.pdf`;
    const outputPdfVaultRel = path.join(exportFolder, outputFileName);
    const outputPdfFullPath = path.join(vaultBase, outputPdfVaultRel);
    const templatePath = this.getTemplatePath();
    if (!fs.existsSync(templatePath)) {
      new import_obsidian.Notice(`Typst template not found at: ${templatePath}`, 6e3);
      return;
    }
    const rawContent = await this.app.vault.read(file);
    const resolveVaultFile = (link) => {
      const target = this.app.metadataCache.getFirstLinkpathDest(link, file.path);
      return target ? path.join(vaultBase, target.path) : null;
    };
    const processedContent = preprocessMarkdown(rawContent, resolveVaultFile);
    const tempMdPath = path.join(os.tmpdir(), `obsidian-export-${Date.now()}-${file.basename}.md`);
    await fs.promises.writeFile(tempMdPath, processedContent, "utf8");
    const noteDir = path.join(vaultBase, path.dirname(file.path));
    const pandocArgs = [
      tempMdPath,
      "-o",
      outputPdfFullPath,
      `--pdf-engine=${this.settings.typstPath}`,
      `--template=${templatePath}`,
      "--pdf-engine-opt=--root=/",
      `--resource-path=.${path.delimiter}${vaultBase}${path.delimiter}${noteDir}`,
      "--table-of-contents",
      "--toc-depth=6",
      `-V`,
      `title=${file.basename}`,
      `-V`,
      `date=${this.formatTimestamp(/* @__PURE__ */ new Date())}`
    ];
    const env = this.getProcessEnv();
    const cwd = vaultBase && fs.existsSync(vaultBase) ? vaultBase : os.tmpdir();
    (0, import_child_process.execFile)(this.settings.pandocPath, pandocArgs, { env, cwd }, async (error, stdout, stderr) => {
      try {
        if (fs.existsSync(tempMdPath)) await fs.promises.unlink(tempMdPath);
      } catch (e) {
      }
      if (error) {
        console.error("Pandoc Typst Export Error:", error, stderr);
        const msg = stderr ? stderr.trim() : error.message;
        new import_obsidian.Notice(`Export Failed: ${msg}`, 1e4);
        return;
      }
      new import_obsidian.Notice(`Successfully exported: ${outputPdfVaultRel}`, 6e3);
    });
  }
};
var PandocTypstSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Pandoc Typst PDF Export Settings" });
    new import_obsidian.Setting(containerEl).setName("Export Folder").setDesc("Folder inside your vault where exported PDFs will be saved").addText((text) => text.setPlaceholder("exports").setValue(this.plugin.settings.exportFolder).onChange(async (value) => {
      this.plugin.settings.exportFolder = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Pandoc Path").setDesc('Path to pandoc executable (defaults to "pandoc")').addText((text) => text.setPlaceholder("pandoc").setValue(this.plugin.settings.pandocPath).onChange(async (value) => {
      this.plugin.settings.pandocPath = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Typst Path").setDesc('Path to typst executable (defaults to "typst" or "/usr/local/bin/typst")').addText((text) => text.setPlaceholder("typst").setValue(this.plugin.settings.typstPath).onChange(async (value) => {
      this.plugin.settings.typstPath = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Custom Typst Template Path").setDesc("Optional path to a custom Typst template. Leave blank to use bundled academic template.").addText((text) => text.setPlaceholder("/path/to/custom_template.typ").setValue(this.plugin.settings.customTemplatePath).onChange(async (value) => {
      this.plugin.settings.customTemplatePath = value;
      await this.plugin.saveSettings();
    }));
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  preprocessMarkdown
});
