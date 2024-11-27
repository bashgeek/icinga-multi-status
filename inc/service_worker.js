importScripts('icinga.js');
importScripts('data.js');

const worker = {
    init: function () {
        icingaData.init();
        worker.refresh();

        chrome.alarms.onAlarm.addListener(() => {
            worker.refresh();
        });
    },

    // Refresh data for all icinga instances
    refresh: function () {
        icingaData.refresh();
        worker.restartTimer();
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
            chrome.alarms.create('icinga-refresh', { delayInMinutes: interval_in_minutes });
        });
    },
};

worker.init();
