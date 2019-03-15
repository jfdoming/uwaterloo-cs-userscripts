// ==UserScript==
// @name         Marmoset Extension
// @namespace    https://github.com/jfdoming/
// @version      0.4
// @license      GNU GPL v3
// @description  An extension that makes using Marmoset just a little easier.
// @author       Julian Dominguez-Schatz
// @match        https://marmoset.student.cs.uwaterloo.ca/*
// @grant        GM_addStyle
// @updateURL    https://github.com/jfdoming/uwaterloo-cs-userscripts/raw/master/marmoset-extensions.user.js
// @downloadURL  https://github.com/jfdoming/uwaterloo-cs-userscripts/raw/master/marmoset-extensions.user.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle("* {font-family: Verdana, Arial;}");

    function log() {
        let newArgs = Array.from(arguments);
        newArgs.unshift("font-weight: bold");
        newArgs.unshift("%cMarmoset extension:");
        console.log.apply(null, newArgs);
    }

    function at(obj, key, def) {
        return (obj && obj[key]) ? obj[key] : def;
    }

    function getTestScore(testResults) {
        function getRowPoints(row) {
            return row.children[3].textContent;
        }
        function didRowPass(row) {
            return row.children[2].textContent == "passed";
        }
        function isRowPrivate(row) {
            return row.children[0].textContent == "secret";
        }

        let testRows = Array.from(testResults.rows);
        if (!testRows) {
            return {total: 0, max: 0};
        }
        return testRows.reduce((rror, row) => {
            let rowPoints = +getRowPoints(row);
            return {
                privateScore: didRowPass(row) * isRowPrivate(row) * rowPoints + at(rror, "privateScore", 0),
                privateMax: isRowPrivate(row) * rowPoints + at(rror, "privateMax", 0),
                overallScore: didRowPass(row) * rowPoints + at(rror, "overallScore", 0),
                overallMax: rowPoints + at(rror, "overallMax", 0)
            }
        });
    }

    function getTestResults(submissionPK = 1704850) {
        let url = (typeof submissionPK == "number") ? ("https://marmoset.student.cs.uwaterloo.ca/view/submission.jsp?submissionPK=" + submissionPK) : submissionPK;
        return fetch(url)
            .then((response) => response ? response.text() : null)
            .then(
        (text) => {
            if (!text) {
                return {};
            }

            let html = new DOMParser().parseFromString(text, "text/html");
            let testResults = html.getElementsByClassName("testResults");
            return getTestScore(testResults[0]);
        });
    }

    function formatTestScore(totalObj, scoreKey = "overallScore", maxKey = "overallMax") {
        return at(totalObj, scoreKey, "-") + "/" + at(totalObj, maxKey, "-");
    }

    let handlers = [];

    function addHandler(href = "", handler = null) {
        href = "https://marmoset.student.cs.uwaterloo.ca/" + href;
        handlers.push({href: href, handler: handler});
    }

    //////////////////////////////////// Add handlers here. ////////////////////////////////////

    addHandler("view/submission.jsp", () => {
        let testResults = document.getElementsByClassName("testResults")[0];
        let totalText = document.createElement("div");
        totalText.style.marginTop = "1rem";
        totalText.style.marginLeft = "2rem";
        totalText.textContent = "Overall score: " + formatTestScore(getTestScore(testResults));
        document.body.insertBefore(totalText, testResults);
    });

    addHandler("view/project.jsp", () => {
        let testResults = document.getElementsByTagName("table")[0];
        let rows = Array.from(testResults.rows);

        // If the assignment deadline has passed, let the user know.
        let ps = document.getElementsByTagName("p");
        if (ps) {
            ps = Array.from(document.getElementsByTagName("p")).filter((el) => el.textContent.startsWith("Deadline"));
            if (ps.length > 0) {
                let then = new Date(ps[0].textContent.replace("Deadline:", "").replace("at", ""));
                if (Date.now() - then >= 0) {
                    // The deadline has passed!
                    ps[0].textContent = "The deadline for this assignment has passed.";
                }
            }
        }

        // Insert the new header cells used for private and overall tests.
        let headerRow = rows[0];
        let privateHeader = document.createElement("th");
        privateHeader.innerHTML = "private tests<br/>score";
        let totalHeader = document.createElement("th");
        totalHeader.innerHTML = "overall tests<br/>score";
        headerRow.insertBefore(privateHeader, headerRow.children[3]);
        headerRow.insertBefore(totalHeader, headerRow.children[4]);

        rows.slice(1).forEach((row) => {
            // Insert the new row cells used for private and overall tests.
            let privateCell = document.createElement("td");
            privateCell.textContent = formatTestScore(null);
            let totalCell = document.createElement("td");
            totalCell.textContent = formatTestScore(null);
            row.insertBefore(privateCell, row.children[3]);
            row.insertBefore(totalCell, row.children[4]);

            let linkChild = row.children[5];
            let linkHref = (linkChild && linkChild.children.length > 0) ? linkChild.children[0].href : null;
            let fetchObj = getTestResults(linkHref);
            fetchObj.then((testObj) => {
                console.log(testObj);
                privateCell.textContent = formatTestScore(testObj, "privateScore", "privateMax");
                totalCell.textContent = formatTestScore(testObj);
            });
        });
    });

    //////////////////////////////////// End adding handlers. //////////////////////////////////

    // Run the correct handler based on the current page.
    let matchingHandlers = handlers.filter((handler) => {
        return handler != null && location.href.startsWith(handler.href);
    });
    if (matchingHandlers.length > 0) {
        log("Handler found for current page, executing...");
        matchingHandlers[0].handler();
    } else {
        log("No handler found for current page.");
    }
})();