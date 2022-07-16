import { StorySheet } from './sheets/story-sheet.js';
import { FullscreenStorySheet } from './sheets/fullscreen-story-sheet.js';

class StoryTeller {
    static getDocumentTypes() {
        return {
            base: JournalSheet,
            story: StorySheet,
            fullscreen: FullscreenStorySheet,
        };
    }

    static getTypeLabels() {
        return {
            base: "STORYTELLER.BaseJournalEntry",
            story: "STORYTELLER.StoryEntry",
            fullscreen: "STORYTELLER.FullscreenStoryEntry",
        };
    }

    init() {
        let types = StoryTeller.getDocumentTypes();
        let labels = StoryTeller.getTypeLabels();

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
}

Hooks.on("init", () => {
    registerSettings()
    game.StoryTeller = new StoryTeller()
    game.StoryTeller.init()

    console.log("Storyteller | Init");
});

Hooks.on("ready", () => {
    EntitySheetConfig.updateDefaultSheets(game.settings.get("core", "sheetClasses"));
    console.log("Storyteller | Ready")
})

Hooks.on("preCreateJournalEntry", preCreateJournalEntry)
function preCreateJournalEntry (entry, data, options, userId) {
    let types = StoryTeller.getDocumentTypes();
    if (Object.keys(types).includes(data.type)) {
        options.type = data.type
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
    game.settings.register('storyteller', 'theme', {
        name: game.i18n.localize('STORYTELLER.Settings.Theme'),
        hint: game.i18n.localize('STORYTELLER.Settings.ThemeHint'),
        scope: "world",
        type: String,
        choices: {
            "book": game.i18n.localize('STORYTELLER.Settings.ThemeBook'),
            "newspaper": game.i18n.localize('STORYTELLER.Settings.ThemeNewspaper')
        },
        default: "book",
        config: true,
    });
}