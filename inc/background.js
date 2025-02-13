const bg = {
    init: function () {
        icingaData.init();

        chrome.alarms.onAlarm.removeListener(bg.refreshAlarm);
        chrome.alarms.onAlarm.addListener(bg.refreshAlarm);

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
            chrome.alarms.get('icinga-refresh', alarm => {
                if (alarm) {
                    return;
                }

                chrome.alarms.create('icinga-refresh', {periodInMinutes: interval_in_minutes});
            });
        });
    },
};


let heartbeatInterval;
async function runHeartbeat() {
    if (typeof chrome !== 'undefined') {
        await chrome.storage.local.set({'last-heartbeat': new Date().getTime()});
    } else {
        await browser.storage.local.set({'last-heartbeat': new Date().getTime()});
    }
}
async function startHeartbeat() {
    // Run the heartbeat once at service worker startup.
    runHeartbeat().then(() => {
        heartbeatInterval = setInterval(runHeartbeat, 15 * 1000);
    });
}
async function stopHeartbeat() {
    clearInterval(heartbeatInterval);
}

chrome.alarms.create("keep-loaded-alarm-0", {periodInMinutes: 1});
setTimeout(() => chrome.alarms.create("keep-loaded-alarm-1", {periodInMinutes: 1}), 20000);
setTimeout(() => chrome.alarms.create("keep-loaded-alarm-2", {periodInMinutes: 1}), 40000);
chrome.alarms.onAlarm.addListener(() => {
    chrome.storage.local.set({'keep-alive': new Date().getTime()});
});
