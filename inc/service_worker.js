importScripts('icinga.js');
importScripts('data.js');
importScripts('background.js');

function isExtensionStartup() {
    if (!chrome.storage.session) return Promise.resolve(true);
    return new Promise(resolve => {
        return chrome.storage.session.get('hasAlreadyStarted', v => {
            resolve(v.hasAlreadyStarted !== true);
        });
    });
}

function setHasAlreadyStarted() {
    if (!chrome.storage.session) return;
    chrome.storage.session.set({
        hasAlreadyStarted: true,
    });
}

chrome.runtime.onStartup.addListener(() => {
    bg.init();
});

chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install' || details.reason === 'update') {
        bg.init();
    }
});

isExtensionStartup().then(isStartup => {
    if (isStartup) {
        bg.init();
        setHasAlreadyStarted();
    }
});
