// ==UserScript==
// @name         Marmoset Extension
// @namespace    https://github.com/jfdoming/
// @version      0.6.4
// @license      GNU GPL v3
// @description  An extension that makes using Marmoset just a little easier.
// @author       Julian Dominguez-Schatz
// @match        https://marmoset.student.cs.uwaterloo.ca/view/*
// @match        https://marmoset.student.cs.uwaterloo.ca/submitServer-*/view/*
// @match        https://marmoset.student.cs.uwaterloo.ca/marmoset-*/view/*
// @grant        GM_addStyle
// @require      https://raw.githubusercontent.com/jfdoming/uwaterloo-cs-userscripts/master/common.js
// @updateURL    https://github.com/jfdoming/uwaterloo-cs-userscripts/raw/master/marmoset-extensions.user.js
// @downloadURL  https://github.com/jfdoming/uwaterloo-cs-userscripts/raw/master/marmoset-extensions.user.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle("* { font-family: Verdana, Arial; font-size: 14px; } table { border-style: solid; border-width: 3px; border-color: black; }");

    settings.hidden.title = "Marmoset Extensions";

    settings.useFastLinks = false;
    settings.cacheScores = false;

    const urlMatch = location.href.match(/https:\/\/marmoset.student.cs.uwaterloo.ca\/[a-zA-Z0-9-_]*?\/view/);
    const BASE_URL = urlMatch && urlMatch[0] ? urlMatch[0] + "/" : "https://marmoset.student.cs.uwaterloo.ca/view/";

    // Logic related to switching pages.

    let handlers = [];
    let currentHref = location.href;

    function registerPage(href = "", handler = null) {
        href = BASE_URL + href;
        handlers.push({href: href, handler: handler});
    }

    function wrongUrl(url) {
        warn("Expected URL but %c" + url + "%c specified.", "color: blue;", "color: auto");
        return {
            then: () => {}
        };
    }

    function navigate(url) {
        log(currentHref + " " + url);
        if (currentHref != url) {
            currentHref = url;
            location.href = url;
        }
    }

    function fetchPage(url, addToHistory = true) {
        if (!exists(url)) {
            return wrongUrl(url);
        }

        log("Fetching page:", url);
        return fetch(url)
            .then((response) => response ? response.text() : null)
            .then(
        (text) => {
            if (!exists(text)) {
                return;
            }

            let html = new DOMParser().parseFromString(text, "text/html");
            if (!exists(html, "body")) {
                return;
            }

            onPageLoad(html.body, url, () => {
                document.body = html.body;
                if (addToHistory) {
                    window.history.pushState(null, null, url);
                }
            });
            currentHref = url;
        }).catch(() => {
            navigate(url);
        });
    }

    function enableLinkRedirect(el) {
        if (!settings.useFastLinks || !exists(el, "addEventListener")) {
            return;
        }

        el.addEventListener("click", (e) => {
            if (!exists(el.href)) {
                return true;
            }

            fetchPage(el.href);
            e.preventDefault();
            return false;
        });
    }

    function onPageLoad(body = document.body, url = location.href, callback) {
        // Prevent reloading the page so our script doesn't get unloaded.
        if (settings.useFastLinks) {
            let linkElements = body.getElementsByTagName("a");
            if (exists(linkElements)) {
                Array.from(linkElements).forEach(enableLinkRedirect);
            }
        }

        // Run the correct handler based on the current page.
        let matchingHandlers = handlers.filter((handler) => {
            return exists(handler, "href") && url.startsWith(handler.href);
        });
        if (matchingHandlers.length > 0) {
            let result = null;
            if (exists(matchingHandlers[0], "handler")) {
                log("Handler found for current page, executing...");
                result = matchingHandlers[0].handler(body);
            } else {
                log("No handler found for current page, ignoring...");
                result = Promise.resolve();
            }

            if (exists(result, "then")) {
                result.then(callback);
            }
        } else {
            log("Current page not registered.");
            if (settings.useFastLinks) {
                navigate(url);
            }
        }
    }

    // Handler-specific helper functions.

    function findElementWithText(parent, type, text) {
        if (!exists(parent, "getElementsByTagName")) {
            return null;
        }

        let items = Array.from(parent.getElementsByTagName(type));
        if (!exists(items, "length") || !exists(items, "filter") || items.length <= 0) {
            return null;
        }

        let filteredItems = items.filter((el) => exists(el, "innerText") && el.innerText.trim().replace(/\s+/, " ").toLowerCase() == text.trim().toLowerCase());
        if (!exists(filteredItems, "length") || filteredItems.length <= 0) {
            return null;
        }
        return filteredItems[0];
    }

    function getTestScore(testResults) {
        function getRowPoints(row) {
            const result = row && row.children[3] ? +row.children[3].textContent : 0;
            return result === result ? result : 0;
        }
        function didRowPass(row) {
            return findElementWithText(row, "td", "passed") != null;
        }
        function isRowPrivate(row) {
            return findElementWithText(row, "td", "secret") != null;
        }
        function isRowRelease(row) {
            return findElementWithText(row, "td", "release") != null;
        }

        let testRows = testResults.rows;
        if (!exists(testRows)) {
            testRows = [];
        }
        return Array.from(testRows).reduce((rror, row) => {
            if (!exists(row)) {
                return rror;
            }

            if (isRowRelease(row)) {
                return rror;
            }

            const rowPoints = getRowPoints(row);
            const rowPassed = didRowPass(row);
            const rowPrivate = isRowPrivate(row);
            return {
                privateScore: rowPassed * rowPrivate * rowPoints + at(rror, "privateScore", 0),
                privateMax: rowPrivate * rowPoints + at(rror, "privateMax", 0),
                overallScore: rowPassed * rowPoints + at(rror, "overallScore", 0),
                overallMax: rowPoints + at(rror, "overallMax", 0)
            };
        }, {
            privateScore: 0,
            privateMax: 0,
            overallScore: 0,
            overallMax: 0
        });
    }

    function getTestResults(submissionPK) {
        if (!exists(submissionPK)) {
            return wrongUrl(submissionPK);
        }

        let url = submissionPK;
        if (typeof submissionPK === "string") {
            const matchResults = submissionPK.match(/^.+?submissionPK=(\d+)\D*?/);
            if (exists(matchResults, "length") && matchResults.length > 1) {
                submissionPK = +matchResults[1];
            } else {
                submissionPK = -1;
            }
        }
        url = BASE_URL + "submission.jsp?submissionPK=" + submissionPK;

        const cacheKey = "submission_score_" + submissionPK;
        if (settings.cacheScores && submissionPK != -1) {
            const storedScoreString = localStorage.getItem(cacheKey);
            if (exists(storedScoreString)) {
                const storedScore = JSON.parse(storedScoreString);
                if (exists(storedScore, "url")) {
                    return Promise.resolve(storedScore);
                }
            }
        }

        return fetch(url)
            .then((response) => response ? response.text() : null)
            .then(
        (text) => {
            if (!exists(text)) {
                return {};
            }

            let html = new DOMParser().parseFromString(text, "text/html");
            let testResults = html.getElementsByClassName("testResults");
            let score = { ...getTestScore(testResults[0]), url };
            let releaseTestText = Array.from(html.getElementsByTagName("p")).find(el => el.textContent.includes("release tests"));
            let releaseTestScoreMatch = releaseTestText ? releaseTestText.textContent.match(/[\s\S]+?(\d+)\/(\d+)[\s\S]+/) : [, 0, 0];
            score.releaseScore = +releaseTestScoreMatch[1];
            score.releaseMax = +releaseTestScoreMatch[2];
            score.overallScore += score.releaseScore;
            score.overallMax += score.releaseMax;

            if (settings.cacheScores) {
                localStorage.setItem(cacheKey, JSON.stringify(score));
            }
            return score;
        });
    }

    function getViewHref(row) {
        if (!exists(row)) {
            return null;
        }

        let linkChild = findElementWithText(row, "td", "view");
        let linkHref = (exists(linkChild, "children") && linkChild.children.length > 0) ? at(linkChild.children[0], "href", null) : null;
        return linkHref;
    }

    function markDiff(testObj, scoreKey = "overallScore", maxKey = "overallMax") {
        return (at(testObj, maxKey, 0) - at(testObj, scoreKey, 0));
    }

    function getBestTestResult(projectPK = 2630) {
        if (!exists(projectPK)) {
            return wrongUrl(projectPK);
        }

        let url = (typeof projectPK == "number") ? (BASE_URL + "project.jsp?projectPK=" + projectPK) : projectPK;
        return fetch(url)
            .then((response) => response ? response.text() : null)
            .then(
        (text) => {
            if (!exists(text)) {
                return {};
            }

            let html = new DOMParser().parseFromString(text, "text/html");
            let submissions = html.getElementsByTagName("table");
            if (!exists(submissions, "length") || submissions.length <= 0) {
                return {};
            }
            let submissionRows = Array.from(submissions[0].rows);

            function getBestSubmission(rows, bestSoFar = null) {
                if (rows.length <= 0) {
                    return bestSoFar;
                }

                const linkHref = getViewHref(rows[0]);
                if (!exists(linkHref)) {
                    // Skip this one.
                    return getBestSubmission(rows.slice(1), bestSoFar);
                }

                function best(obj1, obj2) {
                    if (!exists(obj1)) {
                        return obj2;
                    }
                    if (!exists(obj2)) {
                        return obj1;
                    }
                    return markDiff(obj1) < markDiff(obj2) ? obj1 : obj2;
                }

                const results = getTestResults(linkHref);
                return results.then(testObj => {
                    if (markDiff(testObj) <= 0) {
                        // This means you scored at least the given number of points.
                        return testObj;

                    }
                    return getBestSubmission(rows.slice(1), best(testObj, bestSoFar));
                });
            }
            return getBestSubmission(submissionRows);
        });
    }

    function formatTestScore(totalObj, scoreKey = "overallScore", maxKey = "overallMax") {
        return at(totalObj, scoreKey, "-") + " / " + at(totalObj, maxKey, "-");
    }

    function highlight(cell, testObj, scoreKey = "overallScore", maxKey = "overallMax") {
        if (markDiff(testObj, scoreKey, maxKey) == 0) {
            cell.style.backgroundColor = "rgba(175, 255, 30, 0.35)";
        } else {
            cell.style.backgroundColor = "rgba(255, 0, 0, 0.25)";
        }
    }

    function removeChildren(parent) {
        while (exists(parent, "firstChild")) {
            parent.removeChild(parent.firstChild);
        }
    }

    /////////////////////////////////////////////////// Add handlers here. /////////////////////////////////////////////////////

    registerPage("course.jsp", (body) => {
        let testResults = body.getElementsByTagName("table")[0];
        let rows = Array.from(testResults.rows);

        // Insert the new header cells used for private and overall tests.
        let headerRow = rows[0];
        let totalHeader = document.createElement("th");
        totalHeader.innerHTML = "last overall<br/>score";
        let submitHeader = findElementWithText(headerRow, "th", "submissions");
        if (!exists(submitHeader)) {
            warn("Missing header cell, aborting...");
            return;
        }

        headerRow.insertBefore(totalHeader, submitHeader);

        // Attempt to adjust the MarmoUI cell, if it exists.
        // Note we use setTimeout so that we have a chance of running this AFTER MarmoUI loads.
        setTimeout(() => {
            let lastHeader = findElementWithText(headerRow, "th", "last submission");
            if (exists(lastHeader)) {
                lastHeader.children[0].innerHTML = "last public<br/>score";
            }
        }, 500);

        // Add the overall score cells to each row.
        let promises = [];
        rows.slice(1).forEach((row) => {
            // Insert the new row cells used for private and overall tests.
            let totalCell = document.createElement("td");
            totalCell.textContent = formatTestScore(null);
            let submitCell = findElementWithText(row, "td", "view");
            if (!exists(submitCell)) {
                warn("Missing submit cell.");
                return;
            }

            // We are now guaranteed to have at least one element.
            row.insertBefore(totalCell, submitCell);

            let fetchObj = getBestTestResult(getViewHref(row));
            promises.push(fetchObj.then(testObj => {
                removeChildren(totalCell);
                if (exists(testObj)) {
                    const scoreLink = document.createElement("a");
                    scoreLink.textContent = formatTestScore(testObj);
                    scoreLink.href = at(testObj, "url", "");
                    enableLinkRedirect(scoreLink);
                    totalCell.appendChild(scoreLink);
                    highlight(totalCell, testObj);
                } else {
                    totalCell.textContent = "No submission";
                }
            }));
        });
        return Promise.all(promises);
    });

    registerPage("submission.jsp", (body) => {
        let testResults = body.getElementsByClassName("testResults")[0];
        let totalText = document.createElement("div");
        totalText.style.marginTop = "1rem";
        totalText.style.marginLeft = "2rem";
        totalText.textContent = "Overall score: " + formatTestScore(getTestScore(testResults));
        testResults.parentNode.insertBefore(totalText, testResults);
        return Promise.resolve();
    });

    registerPage("project.jsp", (body) => {
        let testResults = body.getElementsByTagName("table")[0];
        let rows = Array.from(testResults.rows);

        // If the assignment deadline has passed, let the user know.
        let ps = body.getElementsByTagName("p");
        if (ps) {
            ps = Array.from(body.getElementsByTagName("p")).filter((el) => el.textContent.startsWith("Deadline"));
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
        headerRow.insertBefore(totalHeader, headerRow.children[3]);
        headerRow.insertBefore(privateHeader, headerRow.children[3]);

        let promises = [];
        rows.slice(1).forEach((row) => {
            // Insert the new row cells used for private and overall tests.
            let privateCell = document.createElement("td");
            privateCell.textContent = formatTestScore(null);
            let totalCell = document.createElement("td");
            totalCell.textContent = formatTestScore(null);
            row.insertBefore(totalCell, row.children[3]);
            row.insertBefore(privateCell, row.children[3]);

            let fetchObj = getTestResults(getViewHref(row));
            promises.push(fetchObj.then(testObj => {
                privateCell.textContent = formatTestScore(testObj, "privateScore", "privateMax");
                highlight(privateCell, testObj, "privateScore", "privateMax");
                totalCell.textContent = formatTestScore(testObj);
                highlight(totalCell, testObj);
            }));
        });
        return Promise.all(promises);
    });

    /////////////////////////////////////////////////// End adding handlers. ///////////////////////////////////////////////////

    // Print out the user's settings.
    logSettings();

    // Handle when the user clicks the back button.
    if (settings.useFastLinks) {
        window.addEventListener("popstate", (e) => {
            fetchPage(location.href, false);
        });
    }

    // Run our script!
    onPageLoad();
})();
