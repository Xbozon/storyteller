const bookSizeCorrection = 1
const bookWidth = 1390
const bookHeight = 937

export class StorySheet extends JournalSheet {
    pageFlip = "modules/storyteller/sounds/paper-flip.mp3"
    static classes = ["sheet", "story-sheet"];

    static get defaultOptions() {
        if (game.settings.get('storyteller', 'enableScroll')) {
            this.classes.push("scrollable")
        }

        return foundry.utils.mergeObject(super.defaultOptions, {
            baseApplication: 'JournalSheet',
            classes: this.classes,
            template: 'modules/storyteller/templates/story-sheet.html',
            width: getBookWidth(),
            height: getBookHeight(),
            resizable: false,
            closeOnSubmit: false,
            submitOnClose: true,
        });
    }

    sound() {
        if (game.settings.get('storyteller', 'bookOpenSound')) {
            AudioHelper.play({src: this.pageFlip, volume: 0.8, autoplay: true, loop: false}, false);
        }
    }

    /** @inheritdoc */
    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();

        if (game.user.isGM) {
            buttons.unshift({
                label: "STORYTELLER.CopyID",
                class: "switch-copyid",
                icon: "fas fa-crosshairs",
                onclick: ev => this._onCopyID(ev)
            })
        }

        return buttons;
    }

    _onCopyID(event) {
        let savedPage = getPage(this.getData().data._id)

        const text = `game.StoryTeller.showStoryByIDToAll("` + this.object.id + `", ` + savedPage +`)`

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

    /** @inheritdoc */
    async _render(force, options = {}) {
        this.sound()
        await super._render(force, options);

        let data = this.getData().data
        let startPage = data.pages.length >= 1 ? 2 : 1

        let savedPage = getPage(data._id)
        if (savedPage > data.pages.length) {
            savedPage = data.pages.length - 1
        }

        $('#story-' + data._id).turn({
            duration: 500,
            page: savedPage >= 0 ? savedPage : startPage,
             acceleration: true,
            //  display: 'single',
            // autoCenter: true,
            turnCorners: "bl,br",
            elevation: 300,
            when: {
                turned: function (e, page) {
                    setPage(data._id, page)
                }
            }
        });
    }

    /** @inheritdoc */
    async _updateObject(event, formData) {
        if (formData.img === "") {
            formData.img = this.object.data.img
        }
        return super._updateObject(event, formData);
    }

    async _onShowPlayers(event) {
        let id = this.getData().data._id
        // Save current page to global storage
        game.socket.emit("module.storyteller", {
            action: "setPageToOpen",
            id: id,
            page: getPage(id)
        })

        return super._onShowPlayers(event);
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

async function setPage(id, page) {
    let pages = game.settings.get('storyteller', 'pages')
    pages[id] = page
    await game.settings.set('storyteller', 'pages', pages)
}

function getPage(id) {
    let pages = game.settings.get('storyteller', 'pages')
    if (pages[id] === 0) {
        return 1
    }

    return pages[id]
}
