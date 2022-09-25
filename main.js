import { StorySheet } from './sheets/story-sheet.js';
import { StorySheetReverse } from './sheets/story-sheet (reverse).js';
import { StorySheet2Pages } from './sheets/story-sheet (two-pages).js';
import { StorySheetDouble } from './sheets/story-sheet (double).js';
import { StoryCover } from './sheets/story-cover.js';
import { BroadsheetSheet } from './sheets/broadsheet.js';
import { NewspaperSheet } from './sheets/newspaper.js';
import { FullscreenStorySheet } from './sheets/fullscreen-story-sheet.js';

class StoryTeller {
    static getDocumentTypes() {
        return {
            base: JournalSheet,
            story: StorySheet,
            reverse: StorySheetReverse,
            twopages: StorySheet2Pages,
            doubleimage: StorySheetDouble,
            cover: StoryCover,
            broadsheet: BroadsheetSheet,
            newspaper: NewspaperSheet,
            fullscreen: FullscreenStorySheet,
        };
    }

    static getTypeLabels() {
        return {
            base: "STORYTELLER.BaseJournalEntry",
            story: "STORYTELLER.StoryEntry",
            reverse: "STORYTELLER.StorySheetReverse",
            twopages: "STORYTELLER.StorySheet2Pages",
            doubleimage: "STORYTELLER.StorySheetDouble",
            cover: "STORYTELLER.StoryCover",
            broadsheet: "STORYTELLER.BroadsheetEntry",
            newspaper: "STORYTELLER.NewspaperEntry",
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

    showPrevPage(entry) {
        console.log("this entry: " + entry);
        try {
            var page = parseInt(entry.replace(/^(.*[^\d])(\d+)$/, "$2"));
            console.log("this page number: " + page);
            if (page != null) {
                var book = entry.replace(/^(.*[^\d])(\d+)$/, "$1");
                console.log("this book title: " + book);
                try {
                    if (page != 1) {
                        var prev = game.journal.find(x => x.name==(book + (page-1).toString())).id;
                        game.journal.get(prev).sheet.render(true);
                        game.journal.find(x => x.name==entry).sheet.close();
                    } else {
                        if (book != entry) {
                            var prev = game.journal.find(x => x.name==book).id;
                            game.journal.get(prev).sheet.render(true);
                            game.journal.find(x => x.name==entry).sheet.close();
                            
                        }
                    }
                } catch { }
            }
        } catch { }
    }

    showNextPage(entry) {
        try {
            var page = parseInt(entry.replace(/^(.*[^\d])(\d+)$/, "$2"));
            console.log("this page number: " + page);
            if (isNaN(page)) {
                console.log("this is first page");
                var book = entry;
                console.log("this book title: " + book);
                var next = game.journal.find(x => x.name==(book + 1)).id;
                game.journal.get(next).sheet.render(true);
                game.journal.find(x => x.name==entry).sheet.close();
            } else {
                console.log("look for next page number");
                var book = entry.replace(/^(.*[^\d])(\d+)$/, "$1");
                console.log("this book title: " + book);
                try {
                    console.log("next entry: " + book + (page+1).toString());
                    var next = game.journal.find(x => x.name==(book + (page+1).toString())).id;
                    game.journal.get(next).sheet.render(true);
                    game.journal.find(x => x.name==entry).sheet.close();
                } catch { }
            }
        } catch { }
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

    restoreOldStories()
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
