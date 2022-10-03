import { StorySheet } from './story-sheet.js';

export class FullscreenStorySheet extends StorySheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            baseApplication: 'JournalSheet',
            classes: ["sheet", "fullscreen-story-sheet"],
            template: 'modules/storyteller/templates/fullscreen-story-sheet.html',
            width: window.innerWidth,
            height: window.innerHeight,
            resizable: false,
            closeOnSubmit: false,
            submitOnClose: true,
        });
    }

    static async _showEntry(entryId, mode="text", force=true) {
        let entry = await fromUuid(entryId);
        if ( entry.documentName !== "JournalEntry" ) return;
        if ( !force && !entry.visible ) return;

        // Show the sheet with the appropriate mode
        entry.sheet.render(true, {sheetMode: mode});
    }
}