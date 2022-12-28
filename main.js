import { StorySheet } from './sheets/story-sheet.js';
import { FullscreenStorySheet } from './sheets/fullscreen-story-sheet.js';

class StoryTeller {

    static types = {
        base: StorySheet, // ?wut
        story: StorySheet,
        // fullscreen: FullscreenStorySheet,
    }

    static labels = {
        base: "STORYTELLER.BaseJournalEntry",
        story: "STORYTELLER.StoryEntry",
        // fullscreen: "STORYTELLER.FullscreenStoryEntry",
    }


    static getDocumentTypes() {
        return StoryTeller.types;
    }

    static getTypeLabels() {
        return StoryTeller.labels;
    }

    init() {
        let types = StoryTeller.getDocumentTypes();
        let labels = StoryTeller.getTypeLabels();

        this.registerObjects(types, labels)
    }

    registerAddonSheet(s) {
        let types = {}
        let labels = {}

        types[s.key] = s.sheet
        labels[s.key] = s.label

        this.registerObjects(types, labels)

        StoryTeller.types[s.key] = s.sheet
        StoryTeller.labels[s.key] = s.label
    }

    registerObjects(types, labels) {
        for (let [k, v] of Object.entries(labels)) {
            Journal.registerSheet("journals", types[k], {
                types: ["base"],
                makeDefault: false,
                label: game.i18n.localize(v)
            });
        }

        game.system.documentTypes.JournalEntry = game.system.documentTypes.JournalEntry.concat(Object.keys(types)).sort();
        CONFIG.JournalEntry.typeLabels = mergeObject((CONFIG.JournalEntry.typeLabels || {}), labels)
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
    showStoryByIDToAll(id = "") {
        let story = game.journal.get(id)
        story.show("text", true)
    }

    showStoryToPlayerOnly(id = "") {
        let story = game.journal.get(id)
        story.sheet.render(true)
    }

    setVeryDirtyHack(type = "") {
        this.activeType = type
    }

    getVeryDirtyHack() {
        return this.activeType
    }
}

Hooks.on("init", () => {
    registerSettings()
    game.StoryTeller = new StoryTeller()
    game.StoryTeller.init()

    console.log("Storyteller | Init");
});

Hooks.on("ready", () => {
    restoreOldStories()
    console.log("Storyteller | Ready")
})

Hooks.on("closeDialog", (dialog, html, data) => {
    game.StoryTeller.setVeryDirtyHack("")
    let selectForm = document.getElementById("app-" + dialog.appId)
    let select = selectForm.querySelector("select")
    if (select) {
        game.StoryTeller.setVeryDirtyHack(select.value)
    }
})

Hooks.on("preCreateJournalEntry", preCreateJournalEntry)
function preCreateJournalEntry (entry, data, options, userId) {
    let types = StoryTeller.getDocumentTypes();
    let currentType = game.StoryTeller.getVeryDirtyHack()
    if (Object.keys(types).includes(currentType) && currentType !== "base") {
        options.type = game.StoryTeller.getVeryDirtyHack()
    }
}

Hooks.on("createJournalEntry", createJournalEntry)
async function createJournalEntry(doc, options, userId){
    let types = StoryTeller.getDocumentTypes();
    if (game.user.id !== userId || !Object.keys(types).includes(options.type))
        return;

    // De-register the current sheet class
    const sheet = doc.sheet;
    doc._sheet = null;
    delete doc.apps[sheet.appId];


    let cls = types[options.type].name

    await doc.setFlag("core", "sheetClass", "journals." + cls);
    await sheet.close();
    await postCreateJournalEntry(doc.data._id)
}

async function postCreateJournalEntry(id = "") {
    let story = game.journal.get(id)
    story.sheet.render(true)
}

function registerSettings() {
    game.settings.register('storyteller', 'bookOpenSound', {
        name: game.i18n.localize('STORYTELLER.BookOpenSound'),
        hint: game.i18n.localize('STORYTELLER.BookOpenSoundHint'),
        scope: "client",
        type: Boolean,
        default: true,
        config: true,
    });
    game.settings.register('storyteller', 'size', {
        name: game.i18n.localize('STORYTELLER.Settings.Size'),
        hint: game.i18n.localize('STORYTELLER.Settings.SizeHint'),
        scope: "world",
        type: Number,
        choices: {
            70: "70%",
            80: "80%",
            90: "90%",
            100: "100%",
        },
        default: 80,
        config: true
    });
    game.settings.register('storyteller', 'pages', {
        scope: "client",
        type: Object,
        default: {},
        config: false,
    });

    // old stuff
    game.settings.register('storyteller', 'storiesEntries', {
        scope: 'world',
        config: false,
        type: Object,
        default: {}
    });
    game.settings.register('storyteller', 'restored', {
        scope: 'world',
        config: false,
        type: Boolean,
        default: false,
    });
}

function restoreOldStories() {
    if (game.settings.get('storyteller', 'restored')) {
        return
    }

    let stories = game.settings.get('storyteller', 'storiesEntries');
    for (let k of Object.keys(stories)) {
        JournalEntry.create({name: stories[k].name, content: stories[k].content, img: stories[k].img})
    }

    ui.notifications.info(game.i18n.format("Outdated stories have been restored in the form of a regular journal. Please change the default style to Story Sheet manually.", {
        mode: "text",
        title: "Info",
        which: "authorized"
    }));

    game.settings.set('storyteller', 'restored', true)
}