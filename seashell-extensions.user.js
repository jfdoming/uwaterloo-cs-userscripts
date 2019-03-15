// ==UserScript==
// @name         Seashell Extensions - Keyboard Shortcuts and More...
// @namespace    https://github.com/jfdoming/
// @version      0.5.0
// @license      GNU GPL v3
// @description  Seashell extensions, including keyboard shortcuts and other helpful features
// @author       Julian Dominguez-Schatz
// @match        https://www.student.cs.uwaterloo.ca/~cs136//seashell/frontend.html
// @grant        none
// @updateURL    https://github.com/jfdoming/uwaterloo-cs-userscripts/raw/master/seashell-extensions.user.js
// @downloadURL  https://github.com/jfdoming/uwaterloo-cs-userscripts/raw/master/seashell-extensions.user.js
// ==/UserScript==

(function() {
    'use strict';

    // HELP DIALOG //

    // add help button
    let helpLinkContainer = document.createElement("li");
    helpLinkContainer.style.display = "inline";
    let helpLink = document.createElement("a");
    helpLink.href = "";
    helpLink.classList.add("btn");
    helpLink.classList.add("custom-glyph");
    helpLink.style.border = 0;
    helpLink.style.outline = 0;
    helpLink.style.textDecoration = "none";
    helpLink.style.fontVariant = "small-caps";
    helpLink.style.fontSize = "14px";
    helpLink.textContent = "extension help";
    helpLink.addEventListener("click", () => {
        let str = shortcuts.reduce((rror, el) => {
          return rror + el.description + "<br/>";
        }, "");
        openDialog(str, "Keyboard Shortcuts");
    });

    let parent = document.getElementsByClassName("navbar-icons");
    helpLinkContainer.appendChild(helpLink);
    if (parent && parent.length > 0) {
      parent[0].insertBefore(helpLinkContainer, parent[0].firstChild);
    }

    // add help screen
    let helpTextWrapper = document.createElement("div");
    helpTextWrapper.style.zIndex = 10000000;
    helpTextWrapper.style.position = "fixed";
    helpTextWrapper.style.top = "0";
    helpTextWrapper.style.left = "0";
    helpTextWrapper.style.width = "100%";
    helpTextWrapper.style.height = "100%";
    helpTextWrapper.style.display = "none";
    helpTextWrapper.style.flexDirection = "row";
    helpTextWrapper.style.justifyContent = "center";
    helpTextWrapper.style.alignItems = "center";
    helpTextWrapper.tabIndex = "0";
    helpTextWrapper.addEventListener("keydown", (e) => {
      if (e.key == "Escape") {
        closeDialog();
      }
    });

    let helpTextBackground = document.createElement("div");
    helpTextBackground.style.zIndex = 9999999;
    helpTextBackground.style.opacity = 0.7;
    helpTextBackground.style.backgroundColor = "white";
    helpTextBackground.style.position = "fixed";
    helpTextBackground.style.top = "0";
    helpTextBackground.style.left = "0";
    helpTextBackground.style.width = "100%";
    helpTextBackground.style.height = "100%";
    helpTextBackground.addEventListener("click", closeDialog);

    let helpTextContainer = document.createElement("div");
    helpTextContainer.style.borderRadius = "10px";
    helpTextContainer.style.color = "#CCCCCC";
    helpTextContainer.style.width = "400px";
    helpTextContainer.style.maxHeight = "75%";
    helpTextContainer.style.overflow = "auto";
    helpTextContainer.style.overflowWrap = "break-word";
    helpTextContainer.style.zIndex = 10000001;
    helpTextContainer.style.padding = "2em";
    helpTextContainer.style.display = "block";
    helpTextContainer.classList.add("modal-content");
    
    let helpTextTitle = document.createElement("div");
    helpTextTitle.style.marginBottom = "1em";
    helpTextTitle.style.borderBottom = "1px solid #CCCCCC";
    helpTextTitle.style.fontSize = "1.5em";
    
    let helpTextBody = document.createElement("div");
    helpTextBody.style.margin = "0";
    helpTextBody.style.padding = "0";
    helpTextBody.style.border = "none";

    helpTextContainer.appendChild(helpTextTitle);
    helpTextContainer.appendChild(helpTextBody);

    helpTextWrapper.appendChild(helpTextBackground);
    helpTextWrapper.appendChild(helpTextContainer);
    document.body.appendChild(helpTextWrapper);

    function openDialog(text, titleText = "Alert") {
        helpTextTitle.innerHTML = titleText;
        helpTextBody.innerHTML = text;
        document.body.classList.add("modal-open");
        helpTextWrapper.style.display = "flex";
        helpTextWrapper.focus();
    }

    function closeDialog() {
        document.body.classList.remove("modal-open");
        helpTextWrapper.style.display = "none";
    }

    // END HELP DIALOG //

    function ignoreShortcuts() {
        return document.getElementsByClassName("modal fade ng-isolate-scope in")[0];
    }

    let runTab = null;

    let shortcuts = [];
    let shortcutTriggered = false;

    function addCtrlShortcut(keyData, action, description = "") {
        if (!keyData || !action) {
            return;
        }
        let keyCode = keyData;
        let modifiers = [];
        if (typeof keyData != "string") {
            keyCode = keyData[0];
            modifiers = keyData[1];
        }

        if (shortcuts.length == 0) {
            console.log("Adding shortcut listener...");
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

        console.log("Keyboard shortcut added:", description);
        shortcuts.push({description: description, keyCode: keyCode, modifiers: modifiers, action: action, triggered: false});
    }

    addCtrlShortcut("KeyB", () => {
        let runner = document.getElementById("toolbar-set-runner");
        if (!runner) {
            return;
        }

        runner.click();
        runTab = document.getElementsByClassName("file-link-active")[0];
    }, "Ctrl-B (set current file as run file)");

    addCtrlShortcut("KeyR", (e) => {
        if (!runTab) {
            return;
        }

        runTab.click();
        setTimeout(() => {
            document.getElementById("toolbar-set-runner").click();
        }, 250);
    }, "Ctrl-R (execute run file)");

    function getButtonByName(name) {
        return Array.from(document.getElementsByClassName("btn btn-link")).filter((el) => {return el.children && el.children[0] && el.children[0].innerHTML == name})[0];
    }

    // add test
    addCtrlShortcut(["Digit1", ["shiftKey"]], (e) => {
        let testButton = getButtonByName("add test…");
        if (!testButton || !testButton.click) {
            return;
        }

        testButton.click();
    }, "Ctrl-Shift-1 (add test)");

    // add file
    addCtrlShortcut(["Digit2", ["shiftKey"]], (e) => {
        let fileButton = getButtonByName("add file…");
        if (!fileButton || !fileButton.click) {
            return;
        }

        fileButton.click();
    }, "Ctrl-Shift-2 (add file)");

    // submit
    addCtrlShortcut(["KeyS", ["shiftKey"]], (e) => {
        let submitButton = getButtonByName("submit question");
        if (!submitButton || !submitButton.click) {
            return;
        }

        submitButton.click();
        setTimeout(() => {
            let focusButton = document.querySelectorAll("input[value='Submit']")[0];
            focusButton.focus();
        }, 250);
    }, "Ctrl-Shift-S (submit to Marmoset)");

    // help
    addCtrlShortcut(["KeyH", ["shiftKey"]], (e) => {
        helpLink.click();
    }, "Ctrl-Shift-H (open this help page)");
})();
