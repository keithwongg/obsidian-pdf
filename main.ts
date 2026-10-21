import { App, Plugin, PluginSettingTab, Setting, Notice, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFile } from 'child_process';

interface PandocTypstSettings {
  exportFolder: string;
  pandocPath: string;
  typstPath: string;
  customTemplatePath: string;
}

const DEFAULT_SETTINGS: PandocTypstSettings = {
  exportFolder: 'exports',
  pandocPath: 'pandoc',
  typstPath: 'typst',
  customTemplatePath: ''
};

export function preprocessMarkdown(content: string, resolveVaultFile: (link: string) => string | null): string {
  // Convert Obsidian image embeds ![[image.ext|size]] or ![[image.ext]] -> ![alt](path)
  let processed = content.replace(/!\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, linkPath, alias) => {
    const cleanLink = linkPath.trim();
    const resolvedPath = resolveVaultFile(cleanLink);
    if (!resolvedPath) return match;
    let altText = cleanLink.split('/').pop() || cleanLink;
    if (alias && !/^\d+(x\d+)?$/.test(alias.trim())) {
      altText = alias.trim();
    }
    return `![${altText}](${resolvedPath})`;
  });

  // Convert Obsidian wikilinks [[link|alias]] -> alias or [[link]] -> link
  processed = processed.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, linkPath, alias) => {
    return alias ? alias.trim() : linkPath.trim();
  });

  return processed;
}

export default class PandocTypstPlugin extends Plugin {
  settings: PandocTypstSettings;

  async onload() {
    await this.loadSettings();

    // Register Command in Command Palette
    this.addCommand({
      id: 'pandoc-typst-export-pdf',
      name: 'pandoc typst export pdf',
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === 'md') {
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

  private getVaultBasePath(): string {
    const adapter = this.app.vault.adapter as any;
    return adapter.basePath || (typeof adapter.getFullPath === 'function' ? adapter.getFullPath('') : '');
  }

  private getTemplatePath(): string {
    if (this.settings.customTemplatePath && fs.existsSync(this.settings.customTemplatePath)) {
      return this.settings.customTemplatePath;
    }
    const vaultBase = this.getVaultBasePath();
    const pluginTemplate = path.join(vaultBase, this.app.vault.configDir, 'plugins', this.manifest.id, 'template.typ');
    if (fs.existsSync(pluginTemplate)) {
      return pluginTemplate;
    }
    // Fallback: check current directory or bundled template relative to this file
    const localTemplate = path.join(__dirname, 'template.typ');
    if (fs.existsSync(localTemplate)) {
      return localTemplate;
    }
    return pluginTemplate;
  }

  private getProcessEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    const commonPaths = ['/usr/local/bin', '/opt/homebrew/bin', `${process.env.HOME}/.cargo/bin`];
    const currentPath = env.PATH || '';
    const missing = commonPaths.filter(p => !currentPath.includes(p));
    if (missing.length > 0) {
      env.PATH = `${missing.join(':')}:${currentPath}`;
    }
    return env;
  }

  private formatTimestamp(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  async exportCurrentNote(file: TFile) {
    new Notice(`Exporting "${file.basename}" to PDF...`);

    const vaultBase = this.getVaultBasePath();
    const exportFolder = this.settings.exportFolder.trim() || 'exports';

    // Ensure export directory exists in vault
    if (!await this.app.vault.adapter.exists(exportFolder)) {
      await this.app.vault.createFolder(exportFolder);
    }

    const outputPdfVaultRel = path.join(exportFolder, `${file.basename}.pdf`);
    const outputPdfFullPath = path.join(vaultBase, outputPdfVaultRel);
    const templatePath = this.getTemplatePath();

    if (!fs.existsSync(templatePath)) {
      new Notice(`Typst template not found at: ${templatePath}`, 6000);
      return;
    }

    // Read and preprocess active note content
    const rawContent = await this.app.vault.read(file);
    const resolveVaultFile = (link: string): string | null => {
      const target = this.app.metadataCache.getFirstLinkpathDest(link, file.path);
      return target ? path.join(vaultBase, target.path) : null;
    };
    const processedContent = preprocessMarkdown(rawContent, resolveVaultFile);

    // Write to a temporary file
    const tempMdPath = path.join(os.tmpdir(), `obsidian-export-${Date.now()}-${file.basename}.md`);
    await fs.promises.writeFile(tempMdPath, processedContent, 'utf8');

    const pandocArgs = [
      tempMdPath,
      '-o', outputPdfFullPath,
      `--pdf-engine=${this.settings.typstPath}`,
      `--template=${templatePath}`,
      '--table-of-contents',
      '--toc-depth=3',
      `-M`, `title=${file.basename}`,
      `-M`, `date=${this.formatTimestamp(new Date())}`
    ];

    const env = this.getProcessEnv();

    execFile(this.settings.pandocPath, pandocArgs, { env }, async (error, stdout, stderr) => {
      // Clean up temporary markdown file
      try {
        if (fs.existsSync(tempMdPath)) await fs.promises.unlink(tempMdPath);
      } catch (e) {
        // ignore temp cleanup error
      }

      if (error) {
        console.error('Pandoc Typst Export Error:', error, stderr);
        const msg = stderr ? stderr.trim() : error.message;
        new Notice(`Export Failed: ${msg}`, 10000);
        return;
      }

      new Notice(`Successfully exported: ${outputPdfVaultRel}`, 6000);
    });
  }
}

class PandocTypstSettingTab extends PluginSettingTab {
  plugin: PandocTypstPlugin;

  constructor(app: App, plugin: PandocTypstPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Pandoc Typst PDF Export Settings' });

    new Setting(containerEl)
      .setName('Export Folder')
      .setDesc('Folder inside your vault where exported PDFs will be saved')
      .addText(text => text
        .setPlaceholder('exports')
        .setValue(this.plugin.settings.exportFolder)
        .onChange(async (value) => {
          this.plugin.settings.exportFolder = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Pandoc Path')
      .setDesc('Path to pandoc executable (defaults to "pandoc")')
      .addText(text => text
        .setPlaceholder('pandoc')
        .setValue(this.plugin.settings.pandocPath)
        .onChange(async (value) => {
          this.plugin.settings.pandocPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Typst Path')
      .setDesc('Path to typst executable (defaults to "typst" or "/usr/local/bin/typst")')
      .addText(text => text
        .setPlaceholder('typst')
        .setValue(this.plugin.settings.typstPath)
        .onChange(async (value) => {
          this.plugin.settings.typstPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Custom Typst Template Path')
      .setDesc('Optional path to a custom Typst template. Leave blank to use bundled academic template.')
      .addText(text => text
        .setPlaceholder('/path/to/custom_template.typ')
        .setValue(this.plugin.settings.customTemplatePath)
        .onChange(async (value) => {
          this.plugin.settings.customTemplatePath = value;
          await this.plugin.saveSettings();
        }));
  }
}
