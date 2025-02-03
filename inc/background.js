const bg = {
    init: function () {
        icingaData.init();

        if (typeof chrome !== 'undefined') {
            chrome.alarms.onAlarm.removeListener(bg.refreshAlarm);
            chrome.alarms.onAlarm.addListener(bg.refreshAlarm);
        } else {
            browser.alarms.onAlarm.removeListener(bg.refreshAlarm);
            browser.alarms.onAlarm.addListener(bg.refreshAlarm);
        }

        bg.refresh();
    },

    // Refresh method for alarm
    refreshAlarm: function (alarm) {
        if (alarm.name !== 'icinga-refresh') {
            return;
        }

        bg.refresh();
    },

    // Refresh data for all icinga instances
    refresh: function () {
        stopHeartbeat();
        icingaData.refresh();
        startHeartbeat();
        bg.restartTimer();
    },

    // Restart refresh timer
    restartTimer: function () {
        icinga_get_settings(function (settings) {
            settings = settings.settings;

            let real_settings = default_settings;
            if (settings == null) {
                settings = default_settings;
            } else {
                Object.keys(settings).forEach(function (key) {
                    real_settings[key] = settings[key];
                });
                settings = real_settings;
            }

            let interval_in_seconds = (settings.refresh === undefined) ? 30 : settings.refresh;
            let interval_in_minutes = interval_in_seconds / 60;
            if (typeof chrome !== 'undefined') {
                chrome.alarms.get('icinga-refresh', alarm => {
                    if (alarm) {
                        return;
                    }

                    chrome.alarms.create('icinga-refresh', {delayInMinutes: interval_in_minutes});
                });
            } else {
                browser.alarms.get('icinga-refresh', alarm => {
                    if (alarm) {
                        return;
                    }

                    browser.alarms.create('icinga-refresh', {delayInMinutes: interval_in_minutes});
                });
            }
        });
    },
};


let heartbeatInterval;
async function runHeartbeat() {
    await chrome.storage.local.set({ 'last-heartbeat': new Date().getTime() });
}
async function startHeartbeat() {
    // Run the heartbeat once at service worker startup.
    runHeartbeat().then(() => {
        // Then again every 20 seconds.
        heartbeatInterval = setInterval(runHeartbeat, 20 * 1000);
    });
}
async function stopHeartbeat() {
    clearInterval(heartbeatInterval);
}
async function getLastHeartbeat() {
    return (await chrome.storage.local.get('last-heartbeat'))['last-heartbeat'];
}

if (typeof chrome !== 'undefined') {
    chrome.alarms.create("keep-loaded-alarm-0", {periodInMinutes: 1});
    setTimeout(() => chrome.alarms.create("keep-loaded-alarm-1", {periodInMinutes: 1}), 20000);
    setTimeout(() => chrome.alarms.create("keep-loaded-alarm-2", {periodInMinutes: 1}), 40000);
    chrome.alarms.onAlarm.addListener(() => {
        console.log("keeping extension alive - log for debug");
    });
} else {
    browser.alarms.create("keep-loaded-alarm-0", {periodInMinutes: 1});
    setTimeout(() => browser.alarms.create("keep-loaded-alarm-1", {periodInMinutes: 1}), 20000);
    setTimeout(() => browser.alarms.create("keep-loaded-alarm-2", {periodInMinutes: 1}), 40000);
    browser.alarms.onAlarm.addListener(() => {
        console.log("keeping extension alive - log for debug");
    });
}
