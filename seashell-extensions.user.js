// ==UserScript==
// @name         Seashell Extensions - Keyboard Shortcuts and More...
// @namespace    https://github.com/jfdoming/
// @version      0.6.3
// @license      GNU GPL v3
// @description  Seashell extensions, including keyboard shortcuts and other helpful features
// @author       Julian Dominguez-Schatz
// @match        https://www.student.cs.uwaterloo.ca/~cs136//seashell/*
// @match        https://www.student.cs.uwaterloo.ca/~cs136/seashell-old/*
// @grant        GM_addStyle
// @require      https://raw.githubusercontent.com/jfdoming/uwaterloo-cs-userscripts/master/common.js
// @updateURL    https://github.com/jfdoming/uwaterloo-cs-userscripts/raw/master/seashell-extensions.user.js
// @downloadURL  https://github.com/jfdoming/uwaterloo-cs-userscripts/raw/master/seashell-extensions.user.js
// ==/UserScript==

(function() {
    'use strict';

    settings.hidden.title = "Seashell Extensions";

    let pDropdown = null;

    const commentScript = document.createElement("script");
    commentScript.type = "text/javascript";
    commentScript.src = "https://codemirror.net/addon/comment/comment.js";
    document.head.appendChild(commentScript);

    let CodeMirror = null;

    {
        GM_addStyle(`
html {
overflow-y: scroll;
}
#seashell-logo {
cursor: auto !important;
}
#seashell-logo > div {
cursor: pointer;
}

a.dropdown-toggle {
cursor: pointer;
}
a.dropdown-toggle:focus {
/*outline: thin dotted;
outline: 5px auto -webkit-focus-ring-color;
outline-offset: -2px;*/
}
a.dropdown-toggle:hover, a.dropdown-toggle:focus, a.dropdown-toggle[aria-expanded="true"] {
color: #FF5555 !important;
}

#questions-row-container {
display: none;
}

#project-dropdown {
font-size: 20px;
text-align: center;
min-width: 20ch;
border: 1px solid #666666;
display: inline-block;
position: relative;
float: right;
}
#project-dd-wrapper {
position: absolute;
top: calc(15px + 1.42857143 * 1em);
left: 0;
clip: rect(0, 100vh, 100vh, -50px);
z-index: 80;
width: 100%;
pointer-events: none;
}
#project-dd-wrapper.visible {
pointer-events: auto;
}
#project-dd-items {
transform: translateY(-100%);
transition: transform 0.2s ease, box-shadow 0.2s ease;
box-shadow: none;
}
#project-dd-wrapper.visible > #project-dd-items {
transform: translateY(0);
box-shadow: 0px 10px 20px 0px rgba(0, 0, 0, 0.30);
}
.project-dd-item {
cursor: pointer;
padding: 5px;
color: white;
background: #444444;
//transition: color 0.3s ease, background 0.3s ease;
}
.project-dd-item:hover {
color: #FFAAAA;
}
.project-dd-item:hover, .project-dd-item.focus {
background: #3C3C3C;
}
`);
        const div = (id) => {
            const el = document.createElement("div");
            if (exists(id)) {
                el.id = id;
            }
            return el;
        }

        let wasOnProjectPage = false;
        const listener = () => {
            const onProjectPage = !!location.href.match(/.+\/frontend.html\#\/project\/.+/);
            if (onProjectPage) {
                if (!wasOnProjectPage) {
                    log("navigated to project page");

                    const dropdownIntervalId = setInterval(() => {
                        const dropdown = document.querySelector("a.dropdown-toggle");
                        if (dropdown) {
                            dropdown.tabIndex = "0";
                            dropdown.addEventListener("keydown", (e) => {
                                if (e.code == "Space" || e.code == "Enter") {
                                    dropdown.click();

                                    e.preventDefault();
                                    e.stopPropagation();
                                    return false;
                                }
                            });

                            dropdown.addEventListener("blur", (e) => {
                                if (dropdown.parentNode.classList.contains("open") && e.relatedTarget && !dropdown.parentNode.contains(e.relatedTarget)) {
                                    dropdown.click();
                                }
                            });

                            CodeMirror = document.querySelector("#editor > .CodeMirror").CodeMirror;

                            const links = document.querySelectorAll(".questions-row a");
                            if (links && !document.getElementById("project-dropdown")) {
                                const elements = Array.from(links).map(el => ({el: el, text: el.textContent})).reverse();

                                const item = text => {
                                    const el = div();
                                    el.textContent = text;
                                    el.classList.add("project-dd-item");
                                    return el;
                                };

                                const pItems = div("project-dd-items");
                                const pWrapper = div("project-dd-wrapper");
                                const pDisplay = div("project-dd-display");
                                pDropdown = div("project-dropdown");

                                pDropdown.select = i => {
                                    pDropdown.dataset.currentClicked = "false";

                                    if (exists(pDropdown.dataset.kbCurrent)) {
                                        pItems.children[+pDropdown.dataset.kbCurrent].classList.remove("focus");
                                    }

                                    pDropdown.dataset.kbCurrent = i;

                                    pItems.children[+pDropdown.dataset.kbCurrent].classList.add("focus");
                                    pDisplay.children[0].textContent = elements[i].text;
                                };
                                pDropdown.next = () => {
                                    pDropdown.select(Math.min(+pDropdown.dataset.kbCurrent + 1, pItems.children.length - 1));
                                };
                                pDropdown.previous = () => {
                                    pDropdown.select(Math.max(+pDropdown.dataset.kbCurrent - 1, 0));
                                };
                                pDropdown.open = () => {
                                    pWrapper.classList.add("visible");
                                };
                                pDropdown.close = () => {
                                    pWrapper.classList.remove("visible");
                                    if (pDropdown.dataset.currentClicked != "true") {
                                        pDropdown.dataset.currentClicked = "true";
                                        elements[+pDropdown.dataset.kbCurrent].el.click();
                                    }
                                };
                                pDropdown.toggle = () => {
                                    if (pWrapper.classList.contains("visible")) {
                                        pDropdown.close();
                                    } else {
                                        pDropdown.open();
                                    }
                                };

                                pDropdown.addEventListener("keydown", e => {
                                    let eat = false;
                                    if (e.key == "Escape") {
                                        pDropdown.close();
                                        eat = true;
                                    } else if (e.key == "Enter" || e.key == " ") {
                                        pDropdown.toggle();
                                        eat = true;
                                    } else if (e.key == "ArrowUp") {
                                        pDropdown.previous();
                                        eat = true;
                                    } else if (e.key == "ArrowDown") {
                                        pDropdown.next();
                                        eat = true;
                                    }

                                    if (eat) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return false;
                                    }
                                    return true;
                                });

                                pDisplay.tabIndex = 0;
                                pDisplay.appendChild(item(elements[0].text));

                                elements.forEach((el, i) => {
                                    const itm = item(el.text);
                                    itm.addEventListener("click", () => {
                                        pDropdown.select(i);
                                        pDropdown.close();
                                    });
                                    pItems.appendChild(itm);
                                });

                                pDisplay.addEventListener("click", pDropdown.toggle);
                                document.addEventListener("click", e => {
                                    if (!pDropdown.contains(e.target)) {
                                        pDropdown.close();
                                    }
                                });

                                const active = document.querySelector(".question-link-active");
                                if (active) {
                                    const index = elements.findIndex(el => el.text == active.textContent);
                                    pDropdown.select(index);
                                }
                                pDropdown.dataset.currentClicked = "true";

                                pWrapper.appendChild(pItems);
                                pDropdown.appendChild(pDisplay);
                                pDropdown.appendChild(pWrapper);

                                const container = document.querySelector("#questions-row-container");
                                if (container) {
                                    const parent = container.parentNode;
                                    parent.style.paddingRight = "14px";
                                    parent.parentNode.style.padding = "0";
                                    parent.appendChild(pDropdown);
                                } else {
                                    document.body.insertBefore(pDropdown, document.body.firstChild);
                                }
                            }

                            clearInterval(dropdownIntervalId);
                        }
                    }, 500);
                }
            }
            wasOnProjectPage = onProjectPage;
        };
        window.addEventListener("load", listener);
        window.addEventListener("popstate", listener);
    }

    function toSentenceCase(text) {
        return text.length > 0 ? text[0].toUpperCase() + text.substring(1) : "";
    }

    // fix for the Marmoset result dialog
    GM_addStyle(".marmoset-details-body { color: #CCCCCC }");

    // HELP DIALOG //

    // add help button
    let helpLinkContainer = document.createElement("li");
    helpLinkContainer.style.display = "inline";
    let helpLink = document.createElement("a");
    helpLink.href = "";
    helpLink.classList.add("custom-glyph");
    helpLink.style.border = 0;
    helpLink.style.outline = 0;
    helpLink.style.textDecoration = "none";
    helpLink.style.fontVariant = "small-caps";
    helpLink.style.fontSize = "14px";
    helpLink.textContent = "ext. help";
    helpLink.addEventListener("click", () => {
        let str = shortcuts.reduce((rror, el) => {
            return rror + "<b>" + el.shortcut + ":</b> " + toSentenceCase(el.description) + "<br/>";
        }, "");
        openDialog(str, "Keyboard Shortcuts");
    });

    let parent = document.getElementsByClassName("navbar-icons");
    helpLinkContainer.appendChild(helpLink);
    if (parent && parent.length > 0) {
        parent[0].insertBefore(helpLinkContainer, parent[0].firstChild);
    }

    // add help screen
    let HELP_TRANSITION_TIME = "0.3s";
    let HELP_TRANSITION_DISTANCE = "100px";


    let helpTextWrapper = document.createElement("div");
    helpTextWrapper.style.zIndex = 10000000;
    helpTextWrapper.style.position = "fixed";
    helpTextWrapper.style.top = "0";
    helpTextWrapper.style.left = "0";
    helpTextWrapper.style.width = "100%";
    helpTextWrapper.style.height = "100%";
    helpTextWrapper.style.display = "flex";
    helpTextWrapper.style.flexDirection = "row";
    helpTextWrapper.style.justifyContent = "center";
    helpTextWrapper.style.alignItems = "center";
    helpTextWrapper.style.opacity = "0";
    helpTextWrapper.style.pointerEvents = "none";
    helpTextWrapper.style.transition = "opacity " + HELP_TRANSITION_TIME + " ease";
    helpTextWrapper.tabIndex = "0";
    helpTextWrapper.addEventListener("keydown", (e) => {
        if (e.key == "Escape") {
            closeDialog();
        }
    });

    let helpTextBackground = document.createElement("div");
    helpTextBackground.style.zIndex = 9999999;
    helpTextBackground.style.opacity = 0.6;
    helpTextBackground.style.backgroundColor = "white";
    helpTextBackground.style.position = "fixed";
    helpTextBackground.style.top = "0";
    helpTextBackground.style.left = "0";
    helpTextBackground.style.width = "100%";
    helpTextBackground.style.height = "100%";
    helpTextBackground.addEventListener("click", closeDialog);

    let helpTextContainer = document.createElement("div");
    helpTextContainer.style.boxShadow = "#444444 0px 5px 15px";
    helpTextContainer.style.borderColor = "#E5E5E5";
    helpTextContainer.style.color = "#CCCCCC";
    helpTextContainer.style.width = "600px";
    helpTextContainer.style.maxHeight = "75%";
    helpTextContainer.style.overflow = "auto";
    helpTextContainer.style.overflowWrap = "break-word";
    helpTextContainer.style.zIndex = 10000001;
    helpTextContainer.style.display = "block";
    helpTextContainer.style.position = "relative";
    helpTextContainer.style.top = "-" + HELP_TRANSITION_DISTANCE;
    helpTextContainer.style.transition = "top " + HELP_TRANSITION_TIME + " ease";
    helpTextContainer.classList.add("modal-content");

    let helpTextHeader = document.createElement("div");
    helpTextHeader.classList.add("modal-header");

    let helpTextTitle = document.createElement("h4");
    helpTextTitle.classList.add("modal-title");
    helpTextHeader.appendChild(helpTextTitle);

    let helpTextBody = document.createElement("div");
    helpTextBody.classList.add("modal-body");

    helpTextContainer.appendChild(helpTextHeader);
    helpTextContainer.appendChild(helpTextBody);

    helpTextWrapper.appendChild(helpTextBackground);
    helpTextWrapper.appendChild(helpTextContainer);
    document.body.appendChild(helpTextWrapper);

    function openDialog(text, titleText = "Alert") {
        helpTextTitle.innerHTML = titleText;
        helpTextBody.innerHTML = text;
        document.body.classList.add("modal-open");
        helpTextWrapper.style.opacity = "1";
        helpTextWrapper.style.pointerEvents = "auto";
        helpTextContainer.style.top = "0";
        helpTextWrapper.focus();
    }

    function closeDialog() {
        document.body.classList.remove("modal-open");
        helpTextWrapper.style.opacity = "0";
        helpTextWrapper.style.pointerEvents = "none";
        helpTextContainer.style.top = "-" + HELP_TRANSITION_DISTANCE;
    }

    // END HELP DIALOG //

    function ignoreShortcuts() {
        return !!document.getElementsByClassName("modal fade ng-isolate-scope in")[0];
    }

    let runTab = null;

    let shortcuts = [];
    let shortcutTriggered = false;

    function addCtrlShortcut(keyData, action, shortcut = "", description = "") {
        if (!keyData || !action) {
            return;
        }
        let keyCode = keyData;
        let modifiers = [];
        let antiModifiers = [];
        if (typeof keyData != "string") {
            keyCode = keyData[0];

            if (keyData.length > 1) {
                modifiers = keyData[1];
            }

            if (keyData.length > 2) {
                antiModifiers = keyData[2];
            }
        }

        if (shortcuts.length == 0) {
            log("Adding shortcut listener...");
            document.addEventListener("keydown", (e) => {
                if (!e.ctrlKey || e.key == "Control" || ignoreShortcuts()) {
                    return;
                }

                shortcuts.forEach((el) => {
                    if (el.triggered || e.code != el.keyCode) {
                        return;
                    }

                    for (let i = 0; i < el.modifiers.length; i++) {
                        if (!e[el.modifiers[i]]) {
                            return;
                        }
                    }

                    for (let i = 0; i < el.antiModifiers.length; i++) {
                        if (e[el.antiModifiers[i]]) {
                            return;
                        }
                    }

                    if (e.code == el.keyCode && !el.triggered) {
                        shortcutTriggered = true;
                        el.triggered = true;
                        el.action(e);
                    }
                });
            });
            document.addEventListener("keyup", (e) => {
                if (!shortcutTriggered) {
                    return;
                }
                shortcutTriggered = false;
                shortcuts.forEach((el) => {
                    el.triggered = false;
                });
            });
        }

        log("Keyboard shortcut added:", description);
        shortcuts.push({shortcut: shortcut, description: description, keyCode: keyCode, modifiers: modifiers, antiModifiers: antiModifiers, action: action, triggered: false});
    }

    addCtrlShortcut("KeyB", () => {
        const runner = document.getElementById("toolbar-set-runner");
        if (!exists(runner, "click")) {
            return;
        }

        runner.click();
        runTab = document.getElementsByClassName("file-link-active")[0];
    }, "Ctrl-B", "set current file as run file");

    addCtrlShortcut("KeyR", (e) => {
        if (!exists(runTab, "click")) {
            return;
        }

        runTab.click();
        setTimeout(() => {
            document.getElementById("toolbar-set-runner").click();
        }, 250);
    }, "Ctrl-R", "execute run file");

    addCtrlShortcut("KeyE", (e) => {
        if (!exists(runTab, "click")) {
            return;
        }

        runTab.click();
        setTimeout(() => {
            document.getElementById("toolbar-set-runner").click();
        }, 250);
    }, "Ctrl-E", "execute tests");

    function getButtonByName(name) {
        return Array.from(document.getElementsByClassName("btn btn-link")).filter((el) => {
            return exists(el.children, "length") && el.children.length > 0 && exists(el.children[0], "innerHTML") && el.children[0].innerHTML == name;
        })[0];
    }

    // add test
    addCtrlShortcut(["Digit1", ["shiftKey"]], (e) => {
        const testButton = getButtonByName("add test…");
        if (!exists(testButton, "click")) {
            return;
        }

        testButton.click();
    }, "Ctrl-Shift-1", "add test");

    // add file
    addCtrlShortcut(["Digit2", ["shiftKey"]], (e) => {
        const fileButton = getButtonByName("add file…");
        if (!exists(fileButton, "click")) {
            return;
        }

        fileButton.click();
    }, "Ctrl-Shift-2", "add file");

    // submit
    addCtrlShortcut(["KeyS", [], ["shiftKey"]], (e) => {
        const submitButton = getButtonByName("submit question");
        if (!exists(submitButton, "click")) {
            return;
        }

        submitButton.click();
        setTimeout(() => {
            let focusButton = document.querySelectorAll("input[value='Submit']")[0];
            focusButton.focus();
        }, 250);
    }, "Ctrl-S", "open submit to Marmoset dialog");

    // submit directly
    addCtrlShortcut(["KeyS", ["shiftKey"]], (e) => {
        const submitButton = getButtonByName("submit question");
        if (!exists(submitButton, "click")) {
            return;
        }

        submitButton.click();

        // Hide the dialog.
        const style = document.createElement("style");
        style.innerHTML = `div[role="dialog"] { display: none !important; }`;
        document.head.appendChild(style);

        setTimeout(() => {
            const focusButton = document.querySelector("input[value='Submit']");
            focusButton.click();
            setTimeout(() => {
                style.remove();
            }, 250);
        }, 250);
    }, "Ctrl-Shift-S", "submit directly to Marmoset");

    // next project
    addCtrlShortcut(["ArrowLeft", ["shiftKey", "altKey"]], (e) => {
        if (exists(pDropdown)) {
            pDropdown.next();
            pDropdown.close();
        }
    }, "Ctrl-Shift-Alt-Left", "next project");

    // previous project
    addCtrlShortcut(["ArrowRight", ["shiftKey", "altKey"]], (e) => {
        if (exists(pDropdown)) {
            pDropdown.previous();
            pDropdown.close();
        }
    }, "Ctrl-Shift-Alt-Right", "previous project");

    // help
    addCtrlShortcut("F1", (e) => {
        helpLink.click();
    }, "Ctrl-F1", "open this help page");

    // toggle inline comment
    addCtrlShortcut("Slash", (e) => {
        if (!exists(CodeMirror, "hasFocus") || !exists(CodeMirror, "toggleComment") || !CodeMirror.hasFocus()) {
            return;
        }
        CodeMirror.toggleComment();
    }, "Ctrl-/", "toggle inline comment (editor only)");
})();
