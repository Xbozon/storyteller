const bookSizeCorrection = 1
const bookWidth = 695
const bookHeight = 937

export class StoryCover extends DocumentSheet {
    pageFlip = "modules/storyteller/sounds/paper-flip.mp3"

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            baseApplication: 'JournalSheet',
            classes: ["sheet", "story-cover", game.settings.get('storyteller', 'theme')],
            template: 'modules/storyteller/templates/story-cover.html',
            width: getBookWidth(),
            height: getBookHeight(),
            resizable: false,
            closeOnSubmit: false,
            submitOnClose: true,
            viewPermission: CONST.ENTITY_PERMISSIONS.NONE,
        });
    }

    sound() {
        if (game.settings.get('storyteller', 'bookOpenSound')) {
            AudioHelper.play({src: this.pageFlip, volume: 0.8, autoplay: true, loop: false}, false);
        }
    }

    /** @inheritdoc */
    async _render(force, options = {}) {
        this.sound()
        await super._render(force, options);
    }

    /** @inheritdoc */
    async _updateObject(event, formData) {
        if (formData.img === "") {
            formData.img = this.object.data.img
        }
        return super._updateObject(event, formData);
    }

    /** @inheritdoc */
    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();

        if (game.user.isGM) {
            buttons.unshift({
                label: "JOURNAL.ActionShow",
                class: "share-image",
                icon: "fas fa-eye",
                onclick: ev => this._onShowPlayers(ev)
            });
            buttons.unshift({
                label: "JOURNAL.ActionConfigure",
                class: "switch-settings",
                icon: "fas fa-cog",
                onclick: ev => this._onConfigureStory(ev)
            })
            buttons.unshift({
                label: "STORYTELLER.CopyID",
                class: "switch-copyid",
                icon: "fas fa-crosshairs",
                onclick: ev => this._onCopyID(ev)
            })
        }

        return buttons;
    }

    async _onShowPlayers(event) {
        event.preventDefault();
        await this.submit();
        return this.object.show(this._sheetMode, true);
    }

    _onConfigureStory(event) {
        let story = $(event.target).closest(".window-app.story-cover")
        let pageRightImage = story.find('.page-inner.image')
        let pageRightSettings = story.find('.page-inner.settings')
        pageRightImage.toggleClass("hidden")
        pageRightSettings.toggleClass("hidden")
    }

    _onCopyID(event) {
        const text = `game.StoryTeller.showStoryByIDToAll("` + this.object.id + `")`
        let aux = document.createElement("input");
        aux.setAttribute("value", text);
        document.body.appendChild(aux);
        aux.select();
        document.execCommand("copy");
        document.body.removeChild(aux);

        ui.notifications.info(game.i18n.format("STORYTELLER.CopyIDMessage", {
            mode: "text",
            title: "Info",
            which: "authorized"
        }));
    }

    /** Меняем анимацию скрытия книги */
    /** @inheritdoc */
    async close(options = {}) {
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
                this._state = Application.RENDER_STATES.CLOSED;
                resolve();
            });
        });
    }
}

function getBookWidth() {
    let height = getBookHeight()
    return (bookWidth / bookHeight) * height
}

function getBookHeight() {
    let bookSize = game.settings.get('storyteller', 'size') / 100
    return window.innerHeight * bookSize * bookSizeCorrection
}
