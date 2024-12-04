const bg = {
    init: function () {
        icingaData.init();
        bg.refresh();

        if (typeof chrome !== 'undefined') {
            chrome.alarms.onAlarm.addListener(() => {
                bg.refresh();
            });
        } else {
            browser.alarms.onAlarm.addListener(() => {
                bg.refresh();
            });
        }
    },

    // Refresh data for all icinga instances
    refresh: function () {
        icingaData.refresh();
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
                chrome.alarms.create('icinga-refresh', {delayInMinutes: interval_in_minutes});
            } else {
                browser.alarms.create('icinga-refresh', {delayInMinutes: interval_in_minutes});
            }
        });
    },
};
