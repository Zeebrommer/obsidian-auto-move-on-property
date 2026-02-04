var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { Plugin, PluginSettingTab, Setting, normalizePath } = require('obsidian');
const DEFAULT_SETTINGS = {
    rules: [],
    watchedFolders: "",
    watchRoot: true,
    showMoveToast: true,
    showDebugToast: false
};
module.exports = class AutoMoveOnPropertyPlugin extends Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.addSettingTab(new AutoMoveSettingTab(this.app, this));
            this.registerEvent(this.app.vault.on("modify", (file) => __awaiter(this, void 0, void 0, function* () {
                if (!file || file.extension !== "md")
                    return;
                const path = file.path;
                // Only use folders specified in UI settings, plus root if enabled
                let watchedFolders = (this.settings.watchedFolders || "").split(",").map(f => f.trim()).filter(f => f.length > 0);
                if (this.settings.watchRoot) watchedFolders.push("");
                const isWatched = watchedFolders.some(folder => {
                    if (folder === "") return !path.includes("/");
                    return path.startsWith(folder + "/") && path.split("/").length === folder.split("/").length + 1;
                });
                if (!isWatched) return;

                if (this.settings.showDebugToast) {
                    new Notice(`Debug: Checking file ${file.name} in ${path}`);
                }
                const content = yield this.app.vault.read(file);
                const match = content.match(/^---\n([\s\S]*?)\n---/);
                if (!match)
                    return;
                const yaml = match[1];
                for (const rule of this.settings.rules) {
                    const propMatch = yaml.match(new RegExp(`^${rule.property}:[ \t]*["']?([^"'\n]+)["']?`, "m"));
                    if (propMatch && propMatch[1].trim() === rule.value) {
                        const newFolder = normalizePath(rule.folder);
                        const newPath = `${newFolder}/${file.name}`;
                        if (path === newPath)
                            return;
                        yield this.app.vault.createFolder(newFolder).catch(() => { });
                        yield this.app.fileManager.renameFile(file, newPath);
                        if (this.settings.showMoveToast) {
                            new Notice(`Moved: ${file.name} → ${newFolder}`);
                        }
                        return;
                    }
                }
            }))); 
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
};
class AutoMoveSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Auto Move On Property Settings" });

        new Setting(containerEl)
            .setName("Watched folders")
            .setDesc("Comma-separated list of folders to monitor for changes")
            .addText(text => text
                .setPlaceholder("e.g., inbox, drafts, temp")
                .setValue(this.plugin.settings.watchedFolders)
                .onChange(async (value) => {
                    this.plugin.settings.watchedFolders = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("Always watch vault root")
            .setDesc("Include notes in the vault root folder")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.watchRoot)
                .onChange(async (value) => {
                    this.plugin.settings.watchRoot = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("Show move notifications")
            .setDesc("Display a toast notification when a file is moved")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showMoveToast)
                .onChange(async (value) => {
                    this.plugin.settings.showMoveToast = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("Show debug notifications")
            .setDesc("Display debug information toasts (for troubleshooting)")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showDebugToast)
                .onChange(async (value) => {
                    this.plugin.settings.showDebugToast = value;
                    await this.plugin.saveSettings();
                })
            );

        this.plugin.settings.rules.forEach((rule, idx) => {
            const setting = new Setting(containerEl)
                .setName(`Rule ${idx + 1}`)
                .addText(text => text
                    .setPlaceholder("Property")
                    .setValue(rule.property)
                    .onChange(async (value) => {
                        rule.property = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addText(text => text
                    .setPlaceholder("Value")
                    .setValue(rule.value)
                    .onChange(async (value) => {
                        rule.value = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addText(text => text
                    .setPlaceholder("Folder")
                    .setValue(rule.folder)
                    .onChange(async (value) => {
                        rule.folder = value;
                        await this.plugin.saveSettings();
                    })
                )
                .addExtraButton(btn => btn
                    .setIcon("cross")
                    .setTooltip("Delete rule")
                    .onClick(async () => {
                        this.plugin.settings.rules.splice(idx, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );
        });
        new Setting(containerEl)
            .setName("Add Rule")
            .addButton(btn => btn
                .setButtonText("Add")
                .onClick(async () => {
                    this.plugin.settings.rules.push({ property: "", value: "", folder: "" });
                    await this.plugin.saveSettings();
                    this.display();
                })
            );
    }
}
