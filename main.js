const modName = 'storyteller';

// CONFIG.debug.hooks = true

const bookSizeCorrection = 1
const bookScreenSizePercent = 0.8
const bookWidth = 1390
const bookHeight = 934

class StoryTeller {
    static TABS_TEMPLATE = "modules/storyteller/templates/tabs.hbs";

    init() {
        this.activeStory = null

        Hooks.on('renderJournalDirectory', this._onRenderJournalDirectory.bind(this))
        Hooks.on('renderStoryDirectory', this._onRenderStoryDirectory.bind(this))
        Hooks.on('changeSidebarTab', this._onChangeSidebarTab.bind(this))
    }

    async _onRenderJournalDirectory(directoryTab, html, user) {
        const tabsHtml = await renderTemplate(StoryTeller.TABS_TEMPLATE);
        html.prepend(tabsHtml);
        const tabs = new Tabs({
            navSelector: ".storyteller-nav.tabs",
            contentSelector: undefined,
            initial: this.currentTab,
            callback: (event, tabs, tab) => this._onTabSwitch(event, tabs, tab, directoryTab)
        });
        tabs.bind(html[0]);

        if (!directoryTab.popOut)
            this.tabs = tabs;
    }

    async _onRenderStoryDirectory(directoryTab, html, user) {
        const tabsHtml = await renderTemplate(StoryTeller.TABS_TEMPLATE);
        html.prepend(tabsHtml);
        this.tabs.bind(html[0]);

        if (this.currentTab === "stories") {
            html.show()
        }
    }

    async _onChangeSidebarTab(tab) {
        const journal = $('#journal');
        let storiesTab = $('#stories')

        if (tab.tabName !== "journal") { // JournalTab
            this.savedTab = this.currentTab
            this.currentTab = ""
            storiesTab.hide()
        } else {
            this.currentTab = this.savedTab
            if (this.currentTab === "stories") {
                storiesTab.show()
                journal.hide()
            } else {
                journal.show()
                storiesTab.hide()
            }
        }
    }

    _onTabSwitch(event, tabs, tab, directoryTab) {
        if (!directoryTab.popOut)
            this.currentTab = tab;

        const journal = $('#journal');
        const stories = $('#stories');
        if (tab === "stories") {
            journal.hide();
            stories.show();
        } else {
            journal.show();
            stories.hide();
        }
    }

    setActiveStory(entry) {
        // Отдельно на каждом клиенте кроме GM
        if (this.activeStory) {
            this.activeStory.sheet.close()
        }
        this.activeStory = entry
    }

    showStoryByIDToAll(id = "") {
        let story = game.customFolders.stories.entries.get(id)
        if (this.activeStory?.id === story?.id) {
            this.activeStory = null
            story.sheet.close()
        } else {
            this.activeStory = story
            story.sheet.render(true)
        }
        story.show("text", true)
    }

    static addStory(story) {
        let existingStories = game.settings.get(modName, 'storiesEntries')

        game.customFolders.stories.entries.set(story.id, story)
        existingStories[story.id] = story

        game.settings.set(modName, 'storiesEntries', existingStories);
    }

    static deleteStory(story) {
        let existingStories = game.settings.get(modName, 'storiesEntries')
        game.customFolders.stories.entries.delete(story.id);
        delete existingStories[story.id];
        console.log(existingStories)
        game.settings.set(modName, 'storiesEntries', existingStories);
    }

    static updateStory(story, data) {
        let existingStories = game.settings.get(modName, 'storiesEntries');

        existingStories[story.id] = mergeObject(existingStories[story.id], story.data);
        game.customFolders.stories.entries.set(story.id, story)

        game.settings.set(modName, 'storiesEntries', existingStories);
    }

    static getStories() {
        return game.settings.get(modName, 'storiesEntries');
    }

    changeLinkedImageSrc(input) {
        let form = input.closest("form")
        let newSrc = input.value
        let image = form.querySelector("div.image-container")
        let tooltip = form.querySelector("div.image-container .storyteller-tooltip")
        image.style.backgroundImage = "url('" + newSrc + "')";

        if (tooltip) {
            tooltip.style.display = 'none'
        }
    }
}

class StoryDirectory extends SidebarDirectory {
    /** @override */
    static documentName = "StoryEntry";

    /* -------------------------------------------- */
    constructor(...args) {
        super(...args);
    }

    // initialize() {}

    _onCreateFolder(event) {
        event.preventDefault();
        event.stopPropagation();
        ui.notifications.warn(game.i18n.format("STORYTELLER.CantCreateFolder", {
            mode: "text",
            title: "Info",
            which: "authorized"
        }));

        return
        const button = event.currentTarget;
        const parent = button.dataset.parentFolder;
        const data = {parent: parent ? parent : null, type: this.constructor.documentName};
        const options = {top: button.offsetTop, left: window.innerWidth - 310 - FolderConfig.defaultOptions.width};
        StoryFolder.createDialog(data, options);
    }

    /** @override */
    _getEntryContextOptions() {
        let options = super._getEntryContextOptions()

        return [(
            {
                name: "STORYTELLER.CopyID",
                icon: '<i class="fas fa-crosshairs"></i>',
                condition: () => game.user.isGM,
                callback: li => {
                    const entry = game.customFolders.stories.entries.get(li.data("entity-id"));

                    var aux = document.createElement("input");
                    aux.setAttribute("value", entry.id);
                    document.body.appendChild(aux);
                    aux.select();
                    document.execCommand("copy");

                    document.body.removeChild(aux);
                }
            }
        )].concat(options);
    }

    /** @override */
    _injectHTML(html) {
        $('#sidebar').append(html);
        this._element = html;
    }

    render(force, context = {}) {
        super.render(force, context)
        return this
    }

    /** @override */
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "story";
        options.template = "modules/storyteller/templates/stories-directory.html";
        return options;
    }

    /** @override */
    get title() {
        return game.i18n.localize("STORY.Title");
    }

    /** @override */
    get entity() {
        return "Story";
    }

    /** @override */
    static get entity() {
        return "Story";
    }

    /** @override */
    static get folders() {
        return game.customFolders?.stories?.folders;
    }

    /** @override */
    static get collection() {
        return game.customFolders?.stories?.entries;
    }
}

class StoryEntryData extends foundry.abstract.DocumentData {
    static defineSchema() {
        return {
            _id: foundry.data.fields.DOCUMENT_ID,
            name: foundry.data.fields.REQUIRED_STRING,
            content: foundry.data.fields.BLANK_STRING,
            img: foundry.data.fields.IMAGE_FIELD,
            folder: foundry.data.fields.foreignDocumentField({type: foundry.documents.BaseFolder}),
            sort: foundry.data.fields.INTEGER_SORT_FIELD,
            permission: foundry.data.fields.DOCUMENT_PERMISSIONS,
            flags: foundry.data.fields.OBJECT_FIELD
        }
    }
}

class BaseStoryEntry extends ClientDocumentMixin(foundry.abstract.Document) {
    /** @inheritdoc */
    static get schema() {
        return StoryEntryData;
    }

    /** @inheritdoc */
    static get metadata() {
        return mergeObject(super.metadata, {
            id: 'story_' + randomID(10),
            name: "StoryEntry",
            collection: "story",
            label: "DOCUMENT.StoryEntry",
            isPrimary: true,
            permissions: {
                create: "JOURNAL_CREATE"
            }
        });
    }
}

export class StoryEntry extends BaseStoryEntry {
    static async create(data, context = {}) {
        data._id = "story1" + randomID(10)
        let story = new StoryEntry(data, context)
        story._onCreate(data, context, "")
        return data
    }

    async update(data = {}, context = {}) {
        data._id = this.id;
        context.parent = this.parent;
        context.pack = this.pack;

        this.data.update(data)

        this._onUpdate(data, context, "")
        return data;
    }

    async delete(context = {}) {
        context.parent = this.parent;
        context.pack = this.pack;

        this._onDelete(context, "")
        return this
    }

    _onDelete(options, userId) {
        StoryTeller.deleteStory(this)
        ui.stories.render(true)
    }


    _onCreate(data, options, userId) {
        StoryTeller.addStory(this)
        ui.stories.render(true)
    }

    _onUpdate(data, options, userId) {
        StoryTeller.updateStory(this, data)
        ui.stories.render(true)
    }

    async show(mode = "text", force = false) {
        if (!this.isOwner) throw new Error("You may only request to show Journal Entries which you own.");
        return new Promise((resolve) => {
            game.socket.emit("module.storyteller", this.uuid, mode, force, entry => {
                Story._showEntry(this.uuid, mode, true);
                ui.notifications.info(game.i18n.format("JOURNAL.ActionShowSuccess", {
                    mode: mode,
                    title: this.name,
                    which: force ? "all" : "authorized"
                }));
                return resolve(this);
            });
        });
    }
}

export class StorySheet extends DocumentSheet {
    constructor(object, options = {}) {
        super(object, options);

        /**
         * The current display mode of the journal. Either 'text' or 'image'.
         * @type {string|null}
         * @private
         */
        this._sheetMode = this.options.sheetMode || this._inferDefaultMode();

        /**
         * The size of the application when it was in text mode, so we can go back
         * to it when we switch modes.
         * @type {object|null}
         * @private
         */
        this._textPos = null;
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["sheet", "story-sheet"],
            width: getBookWidth(),
            height: getBookHeight(),
            resizable: true,
            closeOnSubmit: false,
            submitOnClose: true,
            viewPermission: CONST.ENTITY_PERMISSIONS.NONE
        });
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    get template() {
        return "modules/storyteller/templates/story-sheet.html";
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    get title() {
        return this.object.permission ? this.object.name : "";
    }

    /* -------------------------------------------- */

    /**
     * Guess the default view mode for the sheet based on the player's permissions to the Entry
     * @return {string}
     * @private
     */
    _inferDefaultMode() {
        const hasImage = !!this.object.data.img;
        const hasText = this.object.data.content;

        // If the user only has limited permission, show an image or nothing
        if (this.object.limited) return hasImage ? "image" : null;

        // Otherwise prefer text if it exists
        return hasText || !hasImage ? "text" : "image";
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async _render(force, options = {}) {
        // Determine the sheet rendering mode
        const mode = options.sheetMode || this._sheetMode;
        if (mode === null) return;

        // Close the existing sheet if the mode has changed
        if ((mode !== this._sheetMode) && this.rendered) {
            await this.close({submit: false});
            options.sheetMode = this._sheetMode = mode;
            if (mode === "image") this._textPos = deepClone(this.position);
            else if (this._textPos) mergeObject(options, this._textPos);
            return this.render(true, options);
        }

        // // Display image mode
        // if (mode === "image") {
        //     const img = this.object.data.img;
        //     const pos = await ImagePopout.getPosition(img);
        //     foundry.utils.mergeObject(options, pos);
        //     options.classes = this.constructor.defaultOptions.classes.concat(ImagePopout.defaultOptions.classes);
        // } else if (mode === "text") {
        //
        // }
        options.classes = this.constructor.defaultOptions.classes

        this._sheetMode = "text";
        // Normal rendering
        await super._render(force, options);


        // If the sheet was first created, activate the editor
        if (options.action === "create") this.activateEditor("content")
    }

    /** Меняем анимацию скрытия книги */
    /** @inheritdoc */
    async close(options = {}) {
        const states = Application.RENDER_STATES;
        let el = this.element;
        super.close(options)
        return new Promise(resolve => {
            el.fadeOut(200, () => {
                el.remove();

                // Clean up data
                this._element = null;
                delete ui.windows[this.appId];
                this._minimized = false;
                this._scrollPositions = null;
                this._state = states.CLOSED;
                resolve();
            });
        });
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();

        // Share Entry
        if (game.user.isGM) {
            buttons.unshift({
                label: "JOURNAL.ActionShow",
                class: "share-image",
                icon: "fas fa-eye",
                onclick: ev => this._onShowPlayers(ev)
            });
        }
        return buttons;
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    getData(options) {
        const data = super.getData(options);
        data.title = this.title; // Needed for image mode
        data.image = this.object.data.img;
        data.folders = game.folders.filter(f => (f.data.type === "StoryEntry") && f.displayed);
        return data
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    async _updateObject(event, formData) {
        if (this._sheetMode === "image") {
            formData.name = formData.title;
            delete formData["title"];
            formData.img = formData.image;
            delete formData["image"];
        }
        return super._updateObject(event, formData);
    }

    /* -------------------------------------------- */

    /**
     * Handle requests to switch the rendered mode of the Journal Entry sheet
     * Save the form before triggering the show request, in case content has changed
     * @param {Event} event   The triggering click event
     * @param {string} mode   The journal mode to display
     */
    async _onSwapMode(event, mode) {
        event.preventDefault();
        await this.submit();
        this.render(true, {sheetMode: mode});
    }

    /* -------------------------------------------- */

    /**
     * Handle requests to show the referenced Journal Entry to other Users
     * Save the form before triggering the show request, in case content has changed
     * @param {Event} event   The triggering click event
     */
    async _onShowPlayers(event) {
        event.preventDefault();
        await this.submit();
        return this.object.show(this._sheetMode, true);
    }


}


export class StoryFolder extends Folder {
    constructor(data = {}) {
        super(mergeObject({
            titleText: 'New Folder',
            colorText: '#000000',
            fontColorText: '#FFFFFF',
            type: "Macro",
            entity: "MacroFolder",
            sorting: 'a',
            parent: null,
            pathToFolder: [],
            macroList: [],
            macros: [],
            folderIcon: null,
            expanded: false
        }, data));
    }

    /** @inheritdoc */
    static get schema() {
        return FakeFolderData
    }

    /** @inheritdoc */
    static get metadata() {
        return mergeObject(super.metadata, {
            name: "Folder",
            collection: "folders",
            label: "DOCUMENT.Folder",
            isPrimary: true,
            types: ["Story"]
        });
    }

    /** @override */
    static create(data = {}) {
        data._id = modName + randomID(10)
        let newFolder = new StoryFolder(data);
        if (!game.customFolders.stories) {
            game.customFolders.stories = {
                folders: new StoryFolderCollection([]),
                entries: new Story([])
            }
        }
        game.customFolders.stories.folders.set(newFolder.id, newFolder);
        console.log(game.customFolders.stories.folders)
        return newFolder;
    }

    // Save object state to game.customFolders and settings
    async save(refresh = true) {
        console.log("StoryFolder save")
    }

    async update(data = this.data, refresh = true) {
        console.log("FAKE update")
        // this.data = mergeObject(data, this.data)
        // Update game folder
        this.collection.get(this.id).data = this.data;
        await this.save(refresh);
    }

    static createDialog(data = {}, options = {}) {
        const label = game.i18n.localize(this.metadata.label);
        const folderData = foundry.utils.mergeObject({
            name: game.i18n.format("ENTITY.New", {entity: label}),
            sorting: "a",
        }, data);
        const folder = new StoryFolder(folderData);
        return new StoryFolderConfig(folder, options).render(true);
    }

    validate({changes, children = true, clean = false, replace = false, strict = false} = {}) {
        return true
    }

    /** @override */
    get collection() {
        return game?.customFolders?.stories?.folders
    }

    /** @override */
    static get collection() {
        return game?.customFolders?.stories?.folders
    }
}

class StoryFolderConfig extends FolderConfig {
    /** @override */
    async _updateObject(event, formData) {
        if (!formData.parent) formData.parent = null;
        if (!this.object.id) {
            this.object.data.update(formData);
            return StoryFolder.create(this.object.data);
        }
        return this.object.update(formData);
    }
}

export class Story extends WorldCollection {
    /** @override */
    static documentName = "StoryEntry";

    /**
     * Return a reference to the singleton instance of this WorldCollection, or null if it has not yet been created.
     * @type {WorldCollection}
     */
    static get instance() {
        initFolders()
        return game.customFolders.stories.entries;
    }


    /* -------------------------------------------- */
    /*  Socket Listeners and Handlers               */

    /* -------------------------------------------- */

    /**
     * Open Socket listeners which transact JournalEntry data
     */
    static _activateSocketListeners(socket) {
        socket.on("module.storyteller", this._showEntry.bind(this));
    }

    /* -------------------------------------------- */

    /**
     * Handle a received request to show a JournalEntry to the current client
     * @param {string} entryId      The ID of the journal entry to display for other players
     * @param {string} mode         The JournalEntry mode to display
     * @param {boolean} force       Display the entry to all players regardless of normal permissions
     * @private
     */
    static async _showEntry(entryId, mode = "text", force = true) {
        let entry = await fromUuid(entryId);
        if (entry.entity !== "StoryEntry") return;
        if (!force && !entry.visible) return;

        // Don't show an entry that has no content
        if (mode === "image" && !entry.data.img) return;
        else if (mode === "text" && !entry.data.content) return;

        game.StoryTeller.setActiveStory(entry)

        // Show the sheet with the appropriate mode
        entry.sheet.render(true, {sheetMode: mode});
    }
}


export class StoryFolderCollection extends WorldCollection {
    /** @override */
    static documentName = "StoryFolder";

    constructor(...args) {
        super(...args);
    }

    /** @override */
    get entity() {
        return "StoryFolder";
    }

    get hidden() {
        return this.find(f => f.isHidden);
    }

    get default() {
        return this.find(f => f.isDefault);
    }

    getPlayerFolder(pId) {
        return this.find(f => f.playerDefault === pId)
    }

    getUserFolder() {
        return this.find(f => game.settings.get(mod, 'user-folder-location') === f._id)
    }
}

const FAKE_FOLDER_ENTITY_TYPES = ["Story"]

export class FakeFolderData extends foundry.data.FolderData {
    static defineSchema() {
        return {
            _id: foundry.data.fields.DOCUMENT_ID,
            name: foundry.data.fields.REQUIRED_STRING,
            type: {
                type: String,
                required: true,
                validate: t => FAKE_FOLDER_ENTITY_TYPES.includes(t),
                validationError: "Invalid Folder type provided"
            },
            description: foundry.data.fields.STRING_FIELD,
            parent: foundry.data.fields.foreignDocumentField({type: foundry.documents.BaseFolder}),
            sorting: {
                type: String,
                required: true,
                default: "a",
                validate: mode => this.SORTING_MODES.includes(mode),
                validationError: "Invalid Folder sorting mode"
            },
            sort: foundry.data.fields.INTEGER_SORT_FIELD,
            color: foundry.data.fields.COLOR_FIELD,
            flags: foundry.data.fields.OBJECT_FIELD
        }
    }

    constructor(data = {}, document = null) {
        super(data, document);
    }

    validate({changes, children = true, clean = false, replace = false, strict = false} = {}) {
        return true
    }

    update(data = {}, options = {}) {
        console.log("FakeFolderData update")
        console.log(data)
        console.log(options)
        ui.stories.render(true)
    }
}


CONFIG.StoryEntry = {
    documentClass: StoryEntry,
    collection: Story,
    sheetClass: StorySheet,
    noteIcons: {
        "Anchor": "icons/svg/anchor.svg",
        "Barrel": "icons/svg/barrel.svg"
    },
    sidebarIcon: "fas fa-book-open"
}
CONFIG.StoryFolder = {
    documentClass: StoryFolder,
    collection: StoryFolderCollection,
    sheetClass: FolderConfig,
}

function initFolders() {
    let stories = game.settings.get(modName, 'storiesEntries');
    for (let k of Object.keys(stories)) {
        game.customFolders.stories.entries.set(k, new StoryEntry(stories[k]))
    }
}

function getBookWidth() {
    let height = getBookHeight()

    return (bookWidth / bookHeight) * height
}

function getBookHeight() {
    return window.innerHeight * bookScreenSizePercent * bookSizeCorrection
}

Hooks.on('init', function () {
    game.settings.register(modName, 'storiesEntries', {
        scope: 'world',
        config: false,
        type: Object,
        default: {}
    });
    game.system.entityTypes.StoryEntry = ["base"]
    if (game.customFolders) {
        game.customFolders.stories = {
            folders: new StoryFolderCollection([]),
            entries: new Story([])
        }
    } else {
        game.customFolders = {
            stories: {
                folders: new StoryFolderCollection([]),
                entries: new Story([])
            }
        }
    }

    game.StoryTeller = new StoryTeller()
    game.StoryTeller.init()
})

Hooks.once('ready', async function () {
    // game.settings.set(modName,'storiesEntries', {});
    ui.stories = new StoryDirectory(StoryDirectory.defaultOptions)
    game.stories = ui.stories

    await initFolders(false);

    Story._activateSocketListeners(game.socket)

    game.stories.render(true)
})
