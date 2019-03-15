// ==UserScript==
// @name         Seashell Extensions - Keyboard Shortcuts and More...
// @namespace    https://github.com/jfdoming/
// @version      0.3
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
        shortcuts.push({keyCode: keyCode, modifiers: modifiers, action: action, triggered: false});
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

    // add test
    addCtrlShortcut(["Digit1", ["shiftKey"]], (e) => {
        let testButton = Array.from(document.getElementsByClassName("btn btn-link")).filter((el) => {return el.children && el.children[0] && el.children[0].innerHTML == "add test…"})[0];
        if (!testButton || !testButton.click) {
            return;
        }

        testButton.click();
    }, "Ctrl-Shift-1 (add test)");

    // submit
    addCtrlShortcut(["KeyS", ["shiftKey"]], (e) => {
        let submitButton = Array.from(document.getElementsByClassName("btn btn-link")).filter((el) => {return el.children && el.children[0] && el.children[0].innerHTML == "submit question"})[0];
        if (!submitButton || !submitButton.click) {
            return;
        }

        submitButton.click();
        setTimeout(() => {
            let focusButton = document.querySelectorAll("input[value='Submit']")[0];
            focusButton.focus();
        }, 250);
    }, "Ctrl-Shift-S (submit to Marmoset)");
})();
