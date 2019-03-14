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
    }, "Ctrl-@ (add test)");

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


// ==UserScript==
// @name        Gist Raw Links
// @version     0.2.0
// @description Add a button that contains a list of gist raw file links
// @license     MIT
// @author      Rob Garrison
// @namespace   https://github.com/Mottie
// @include     https://gist.github.com/*
// @run-at      document-idle
// @grant       GM_addStyle
// @grant       GM.addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM.xmlHttpRequest
// @connect     api.github.com
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js?updated=20180103
// @icon        https://github.githubassets.com/pinned-octocat.svg
// @updateURL   https://raw.githubusercontent.com/Mottie/GitHub-userscripts/master/gist-raw-links.user.js
// @downloadURL https://raw.githubusercontent.com/Mottie/GitHub-userscripts/master/gist-raw-links.user.js
// ==/UserScript==
(() => {
	"use strict";

	GM.addStyle(`
		.ghrl-get-list, .ghrl-files a { cursor:pointer; }
		.ghrl-files div { text-align:center; }
		.gist-count-links { z-index: 21; }
	`);

	const item = document.createElement("li");
	item.className = "d-inline-block mr-3";

	function addButton(node) {
		const button = item.cloneNode();
		button.innerHTML = `
			<details class="details-reset details-overlay select-menu">
				<summary class="select-menu-button">
					<span class="ghrl-get-list" data-menu-button>🍣 Raw urls</span>
				</summary>
				<details-menu class="select-menu-modal position-absolute ghrl-files" style="z-index: 99;" aria-label="Raw gist links">
					<div class="select-menu-header">
						<span class="select-menu-title">Filter options</span>
					</div>
					<div class="select-menu-list">
						<img src="https://assets-cdn.github.com/images/spinners/octocat-spinner-32.gif" width="32" alt="">
					</div>
				</details-menu>
			</details>`;
		node.insertBefore(button, node.childNodes[0]);
	}

	function update() {
		const gists = $$(".gist-snippet");
		let indx = gists.length;
		if (indx) {
			while (indx--) {
				// only save dabblet files from list
				if (!$(".ghrl-get-list", gists[indx])) {
					addButton($(".gist-snippet-meta ul", gists[indx]));
				}
			}
		}
	}

	function addList(link, files) {
		let html = "";
		Object.keys(files).forEach(file => {
			// remove version sha from raw_url to always point at
			// the latest version of the file - see #18
			const url = files[file].raw_url.replace(/raw\/\w+\//, "raw/");
			html += `
				<a href="${url}" class="js-selected-navigation-item select-menu-item ghrl-file" role="menuitem" aria-current="page>
					<span class="select-menu-item-text" data-menu-button-text>
						${file}
					</span>
				</a>`;
		});
		$(".ghrl-files", link.closest("li")).innerHTML = html;
	}

	function loadFileList(link) {
		let url,
			el = link.closest("li");
		el = $("a", el.nextElementSibling);
		if (el) {
			url = el.href.split("/");
			const gistid = url.pop();
			GM.xmlHttpRequest({
				method : "GET",
				url : `https://api.github.com/gists/${gistid}`,
				onload : response => {
					if (response.status !== 200) {
						$(".ghrl-files", link.parentNode).innerHTML = response.message;
						return console.error(response);
					}
					let json = false;
					try {
						json = JSON.parse(response.responseText);
					} catch (err) {
						return console.error(`Invalid JSON for gist ${gistid}`);
					}
					if (json && json.files) {
						addList(link, json.files);
					}
				}
			});
		}
	}

	function addBindings() {
		document.addEventListener("click", function(event) {
			const target = event.target;
			if (target.classList.contains("ghrl-get-list")) {
				if (!$(".dropdown-item", target.parentNode)) {
					loadFileList(target);
				}
			}
		});
	}

	function $(str, el) {
		return (el || document).querySelector(str);
	}

	function $$(str, el) {
		return Array.from((el || document).querySelectorAll(str));
	}

	document.addEventListener("pjax:end", update);
	update();
	addBindings();
})();