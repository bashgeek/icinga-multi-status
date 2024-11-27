const bg = {
    timer: undefined,

    init: function () {
        bg.refresh();
        icingaData.init();
    },

    // Refresh data for all icinga instances
    refresh: function () {
        if (bg.timer !== undefined) {
            clearTimeout(bg.timer);
        }

        icingaData.refresh();

        bg.restartTimer();
    },

    // Restart refresh timer
    restartTimer: function () {
        if (bg.timer !== undefined) {
            clearInterval(bg.timer);
        }

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

            let interval = (settings.refresh === undefined) ? 30000 : settings.refresh * 1000;
            bg.timer = setTimeout(function () {
                bg.refresh();
            }, interval);
        });
    },
};

bg.init();
