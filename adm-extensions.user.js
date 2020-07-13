// ==UserScript==
// @name         Course Search Extension
// @namespace    https://github.com/jfdoming/
// @version      0.1
// @license      GNU GPL v3
// @description  An extension that makes searching for courses just a little easier.
// @author       Julian Dominguez-Schatz
// @match        http://www.adm.uwaterloo.ca/*
// @grant        GM_addStyle
// @require      https://raw.githubusercontent.com/jfdoming/uwaterloo-cs-userscripts/master/common.js
// @updateURL    https://github.com/jfdoming/uwaterloo-cs-userscripts/raw/master/adm-extensions.user.js
// @downloadURL  https://github.com/jfdoming/uwaterloo-cs-userscripts/raw/master/adm-extensions.user.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        * {
            font-family: Verdana, Arial;
            font-size: 14px;
            box-sizing: border-box;
        }
        h1, h1 * {
            font-size: 2rem;
        }
        h2, h2 * {
            font-size: 1.5rem;
        }
        input, select {
            padding: 1px 2px;
            margin-right: 2px;
        }
        p > table {
            border-style: solid;
            border-width: 3px;
            border-color: black;
            border-collapse: collapse;
        }
        p > table td:not([colspan="4"]), p > table th {
            padding: 5px;
        }
        p > table > tbody > tr > th {
            background: gold;
        }
        a {
            color: black;
        }
        a:hover {
            text-decoration: none;
        }

        input[type="reset"] {
            display: none; /* No reason for a reset button. */
        }

        /* Search */
        input[name="cournum"] {
            margin-top: 5px;
        }
        #container {
            margin-top: 5px;
            width: 750px;
            padding: 5px;
            background: gold;
            border: 3px solid black;
        }
        #container > :last-child {
            margin-bottom: 0;
        }
    `);

    const SEASONS = {
        Fall: 9,
        Winter: 1,
        Spring: 5,
    };
    const SEASON_VALUES = Object.values(SEASONS).sort();

    const qs = document.querySelector.bind(document);
    const el = document.createElement.bind(document);
    const text = document.createTextNode.bind(document);
    const append = (prev, next) =>
        prev.parentNode.insertBefore(next, prev.nextSibling);
    const listen = (el, evt, handler) => el.addEventListener(evt, handler);

    const updateControls = () => {
        const oldSessSelect = qs("[name='sess']");
        const sessSelect = el("input");
        sessSelect.type = "hidden";
        sessSelect.name = oldSessSelect.name;
        sessSelect.value = oldSessSelect.value;
        append(oldSessSelect, sessSelect);
        oldSessSelect.remove();

        const container = el("div");
        container.id = "container";

        const seasonSelect = el("select");
        container.appendChild(seasonSelect);
        Object.entries(SEASONS).map(([season, month]) => {
            const option = el("option");
            option.value = month;
            option.text = season;
            return option;
        }).forEach(option => seasonSelect.appendChild(option));

        const yearEntry = el("input");
        yearEntry.type = "number";
        yearEntry.min = 1900;
        yearEntry.max = 2100;
        append(seasonSelect, yearEntry);

        const updateSessionValue = () => {
            sessSelect.value = (yearEntry.value - 1900) * 10 + +seasonSelect.value;
        };
        const updateSession = lsKey => newValue => {
            updateSessionValue();
            localStorage.setItem(lsKey, newValue);
            localStorage.setItem("savedDate", new Date());
        };
        const updateSessionPart = lsKey => {
            const update = updateSession(lsKey);
            return e => update(e.srcElement.value);
        };
        listen(seasonSelect, "change", updateSessionPart("season"));
        listen(yearEntry, "change", updateSessionPart("year"));

        const nextButton = el("input");
        nextButton.type = "button";
        nextButton.value = "Next term";
        listen(nextButton, "click", () => {
            const currentIndex = SEASON_VALUES.findIndex(value => value == seasonSelect.value);
            if (currentIndex == -1) {
                return;
            }
            const newIndex = (currentIndex + 1) % SEASON_VALUES.length;
            seasonSelect.value = SEASON_VALUES[newIndex];
            updateSession("season")(seasonSelect.value);

            if (newIndex == 0) {
                yearEntry.value = +yearEntry.value + 1;
                updateSession("year")(yearEntry.value);
            }
        });
        append(yearEntry, nextButton);

        const previousButton = el("input");
        previousButton.type = "button";
        previousButton.value = "Previous term";
        listen(previousButton, "click", () => {
            const currentIndex = SEASON_VALUES.findIndex(value => value == seasonSelect.value);
            if (currentIndex == -1) {
                return;
            }
            const newIndex = (((currentIndex - 1) % SEASON_VALUES.length) + SEASON_VALUES.length) % SEASON_VALUES.length;
            seasonSelect.value = SEASON_VALUES[newIndex];
            updateSession("season")(seasonSelect.value);

            if (newIndex == SEASON_VALUES.length - 1) {
                yearEntry.value = +yearEntry.value - 1;
                updateSession("year")(yearEntry.value);
            }
        });
        append(nextButton, previousButton);

        // Move the rest of the form into the container.
        let arr = Array.from(sessSelect.parentNode.children);
        for (let i = arr.indexOf(sessSelect) + 1; i < arr.length; ++i) {
            container.appendChild(arr[i]);
        }
        append(sessSelect, container);

        // Decide default values.
        const savedDate = localStorage.getItem("savedDate");
        const now = new Date();
        let setSeason = false;
        let setYear = false;
        if (savedDate && now - new Date(savedDate) < 5 * 60 * 1000) {
            const oldSeason = localStorage.getItem("season");
            const oldYear = localStorage.getItem("year");
            if (oldSeason && Object.values(SEASONS).includes(+oldSeason)) {
                seasonSelect.value = oldSeason;
                setSeason = true;
            }
            if (oldYear && +oldYear == +oldYear) {
                yearEntry.value = oldYear;
                setYear = true;
            }
        }
        if (!setSeason) {
            let value = SEASON_VALUES.find(value => value > now.getMonth());
            if (value == null) {
                value = SEASON_VALUES[0];
            }
            seasonSelect.value = value;
        }
        if (!setYear) {
            const isNextYear = seasonSelect.value < now.getMonth();
            yearEntry.value = now.getFullYear() + isNextYear;
        }
        updateSessionValue();

        // Linkify!
        const infoLogin = qs("h2");
        const link = el("a");
        link.href = "https://quest.pecs.uwaterloo.ca/psp/SS/ACADEMIC/SA/?cmd=login&languageCd=ENG";
        link.textContent = "Log in to Quest";
        const restText = text(" to see Course Selection Offerings.");
        infoLogin.innerHTML = "";
        infoLogin.appendChild(link);
        infoLogin.appendChild(restText);

        // Remove unnecessary text/nodes.
        const prevBrNode = infoLogin.previousSibling;
        if (prevBrNode.tagName === "BR") {
            prevBrNode.remove();
        }
        const brNode = infoLogin.nextSibling;
        const nextText = brNode.nextSibling;
        const followBrNode = nextText.nextSibling;
        if (brNode.tagName === "BR" && nextText.textContent.includes("What term are you looking for?")) {
            infoLogin.nextSibling.remove();
            nextText.remove();
            if (followBrNode.tagName === "BR" && followBrNode.nextSibling.tagName === "BR") {
                followBrNode.remove();
            }
        }
    };

    const handlers = [
        {
            match: url => url.includes("under.html"),
            handle: updateControls,
        }
    ];

    settings.hidden.title = "ADM uWaterloo Extension";

    // Print out the user's settings.
    logSettings();

    // Initialize.
    const page = handlers.find(({match}) => match(location.href));
    if (page) {
        page.handle();
    }
})();
