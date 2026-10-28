import { App, Plugin, PluginSettingTab, Setting, Notice, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFile } from 'child_process';

interface PandocTypstSettings {
  exportFolder: string;
  templateChoice: 'two-column' | 'single-column' | 'cheatsheet' | 'custom';
  pandocPath: string;
  typstPath: string;
  customTemplatePath: string;
}

const DEFAULT_SETTINGS: PandocTypstSettings = {
  exportFolder: 'exports',
  templateChoice: 'two-column',
  pandocPath: 'pandoc',
  typstPath: 'typst',
  customTemplatePath: ''
};

export function preprocessMarkdown(content: string, resolveVaultFile: (link: string) => string | null = (p) => `/mock/vault/${p}`): string {
  let frontmatter = '';
  let body = content;

  // Check if note starts with YAML frontmatter
  if (content.startsWith('---')) {
    const endIdx = content.slice(3).indexOf('\n---');
    if (endIdx !== -1) {
      const candidate = content.slice(3, 3 + endIdx);
      const lines = candidate.split('\n').filter(l => l.trim().length > 0);
      const isLikelyYaml = lines.length === 0 || lines.every(l => {
        const trimmed = l.trim();
        return trimmed.startsWith('#') || /^[a-zA-Z0-9_-]+(\[[^\]]*\])?\s*:/.test(trimmed) || /^\s*-\s+/.test(l);
      });

      if (isLikelyYaml) {
        let hasTitle = false;
        let fallbackName = '';
        const sanitizedLines = lines.map(line => {
          const sanitized = line.replace(/^(\s*[\w.-]+\s*:\s*)(\*|\&)([^\s\n]+.*)$/, '$1"$2$3"');
          if (/^\s*title\s*:/i.test(sanitized)) hasTitle = true;
          const fnMatch = sanitized.match(/^\s*(?:file[_-\s]?name)\s*:\s*(.+)$/i);
          if (fnMatch) fallbackName = fnMatch[1].trim();
          return sanitized;
        });
        if (!hasTitle && fallbackName) {
          sanitizedLines.push(`title: ${fallbackName}`);
        }
        frontmatter = `---\n${sanitizedLines.join('\n')}\n---\n`;
        body = content.slice(3 + endIdx + 4);
      }
    }
  }

  // Convert horizontal rules in body from --- to *** so Pandoc never treats them as YAML blocks
  body = body.replace(/^([ \t]*-{3,}[ \t]*)$/gm, '***');

  // Convert Obsidian image embeds ![[image.ext|size]] or ![[image.ext]] -> ![alt](path)
  body = body.replace(/!\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, linkPath, alias) => {
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
  body = body.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, linkPath, alias) => {
    return alias ? alias.trim() : linkPath.trim();
  });

  // Convert HTML <u>...</u> to Pandoc native underline span
  body = body.replace(/<u>([\s\S]*?)<\/u>/gi, '[$1]{.underline}');

  return frontmatter + body;
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

    this.addCommand({
      id: 'pandoc-typst-export-cheatsheet-pdf',
      name: 'pandoc typst export cheatsheet pdf',
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === 'md') {
          if (!checking) {
            this.exportCurrentNote(activeFile, 'cheatsheet');
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

  private getTemplatePath(choiceOverride?: PandocTypstSettings['templateChoice']): string {
    const choice = choiceOverride || this.settings.templateChoice;
    if (choice === 'custom' && this.settings.customTemplatePath?.trim()) {
      const customPath = this.settings.customTemplatePath.trim();
      if (fs.existsSync(customPath)) {
        return customPath;
      }
    }

    const templateFileName = choice === 'single-column'
      ? 'template-single.typ'
      : choice === 'cheatsheet'
        ? 'template-cheatsheet.typ'
        : 'template.typ';

    const vaultBase = this.getVaultBasePath();
    const pluginTemplate = path.join(vaultBase, this.app.vault.configDir, 'plugins', this.manifest.id, templateFileName);
    if (fs.existsSync(pluginTemplate)) {
      return pluginTemplate;
    }
    // Fallback: check current directory or bundled template relative to this file
    const localTemplate = path.join(__dirname, templateFileName);
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

  private formatFileTimestamp(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  async exportCurrentNote(file: TFile, templateOverride?: PandocTypstSettings['templateChoice']) {
    new Notice(`Exporting "${file.basename}" to PDF...`);

    const vaultBase = this.getVaultBasePath();
    const exportFolder = this.settings.exportFolder.trim() || 'exports';

    // Ensure export directory exists in vault
    if (!await this.app.vault.adapter.exists(exportFolder)) {
      await this.app.vault.createFolder(exportFolder);
    }

    const safeBaseName = file.basename.replace(/\s+/g, '_');
    const fileTimestamp = this.formatFileTimestamp(new Date());
    const outputFileName = `${safeBaseName}_${fileTimestamp}.pdf`;
    const outputPdfVaultRel = path.join(exportFolder, outputFileName);
    const outputPdfFullPath = path.join(vaultBase, outputPdfVaultRel);

    // Read and preprocess active note content
    const rawContent = await this.app.vault.read(file);
    const resolveVaultFile = (link: string): string | null => {
      const target = this.app.metadataCache.getFirstLinkpathDest(link, file.path);
      return target ? path.join(vaultBase, target.path) : null;
    };
    const processedContent = preprocessMarkdown(rawContent, resolveVaultFile);

    const fmMatch = processedContent.match(/^---\n([\s\S]*?)\n---\n/);
    const fmText = fmMatch ? fmMatch[1] : '';
    const yamlTemplateMatch = fmText.match(/^\s*template\s*:\s*['"]?(cheatsheet|single-column|two-column)['"]?\s*$/im);
    const effectiveChoice = templateOverride || (yamlTemplateMatch ? yamlTemplateMatch[1].toLowerCase() as PandocTypstSettings['templateChoice'] : this.settings.templateChoice);
    const templatePath = this.getTemplatePath(effectiveChoice);

    if (!fs.existsSync(templatePath)) {
      new Notice(`Typst template not found at: ${templatePath}`, 6000);
      return;
    }

    // Write to a temporary file
    const tempMdPath = path.join(os.tmpdir(), `obsidian-export-${Date.now()}-${file.basename}.md`);
    await fs.promises.writeFile(tempMdPath, processedContent, 'utf8');

    const noteDir = path.join(vaultBase, path.dirname(file.path));
    const hasYamlTitle = /^\s*title\s*:/im.test(fmText);
    const hasYamlDate = /^\s*date\s*:/im.test(fmText);
    const pandocArgs = [
      tempMdPath,
      '-o', outputPdfFullPath,
      `--pdf-engine=${this.settings.typstPath}`,
      `--template=${templatePath}`,
      '--pdf-engine-opt=--root=/',
      `--resource-path=.${path.delimiter}${vaultBase}${path.delimiter}${noteDir}`,
    ];
    if (effectiveChoice !== 'cheatsheet') {
      pandocArgs.push('--table-of-contents', '--toc-depth=6');
    }
    if (!hasYamlTitle) {
      pandocArgs.push('-V', `title=${file.basename}`);
    }
    if (!hasYamlDate) {
      pandocArgs.push('-V', `date=${this.formatTimestamp(new Date())}`);
    }

    const env = this.getProcessEnv();
    const cwd = vaultBase && fs.existsSync(vaultBase) ? vaultBase : os.tmpdir();

    execFile(this.settings.pandocPath, pandocArgs, { env, cwd }, async (error, stdout, stderr) => {
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
      .setName('Template Layout')
      .setDesc('Select the PDF template layout to use for exports')
      .addDropdown(dropdown => dropdown
        .addOption('two-column', 'Two Column (Academic)')
        .addOption('single-column', 'Single Column')
        .addOption('cheatsheet', 'Cheatsheet (5-Column Landscape)')
        .addOption('custom', 'Custom Template File')
        .setValue(this.plugin.settings.templateChoice || 'two-column')
        .onChange(async (value: 'two-column' | 'single-column' | 'cheatsheet' | 'custom') => {
          this.plugin.settings.templateChoice = value;
          await this.plugin.saveSettings();
        }));

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
