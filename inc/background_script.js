function isExtensionStartup() {
    if (!browser.storage.session) return Promise.resolve(true);
    return new Promise(resolve => {
        return browser.storage.session.get('hasAlreadyStarted', v => {
            resolve(v.hasAlreadyStarted !== true);
        });
    });
}

function setHasAlreadyStarted() {
    if (!browser.storage.session) return;
    browser.storage.session.set({
        hasAlreadyStarted: true,
    });
}

browser.runtime.onStartup.addListener(() => {
    bg.init();
});

browser.runtime.onInstalled.addListener(details => {
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
