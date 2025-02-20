bg.init();

browser.runtime.onStartup.addListener(() => {
    bg.init();
});

browser.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install' || details.reason === 'update') {
        bg.init();
    }
});
