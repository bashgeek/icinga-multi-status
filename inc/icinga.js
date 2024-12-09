let alarm_last_played_time = 0;
let alarm_played_last_refresh = false;
let notf_store = [];

function icinga_check()
{
    // Errors
    let error_counts = {instance: 0, warnings: 0, downs: 0, unknown: 0};

    // Check for instance errors
    icinga_get_instances(function (instances) {
        instances = instances.instances;

        if (instances == null) {
            instances = [];
        }

        if (instances.length) {
            for (i = 0; i < instances.length; i++) {
                let e = instances[i];
                if (e.active) {
                    if (e.error) {
                        error_counts.instance += 1;
                    }
                }
            }
        }

        let should_play_alarm = false;
        icingaData.getHosts(function(data){
            if (Object.keys(data.hosts).length === 0) {
                return;
            }

            // Go through hosts
            Object.keys(data.hosts).forEach(function(h, h_i){
                let host = data.hosts[h];
                let instance = instances[host.instance];

                // something is wrong with host != UP && != PENDING
                // Possible DOWN UNREACHABLE UP
                if (host.status === 'DOWN' || host.status === 'UNREACHABLE') {
                    // Just if no downtime or acknowledged based on instance settings
                    if (!(host.down && instance.hide_down) && !(host.ack && instance.hide_ack) && !(host.state_type === 'SOFT' && instance.hide_soft)) {
                        icinga_notification(host.instance + '_host_' + host.name, 'Host Problem', host.name + ' (' + host.status + ' - ' + host.state_type + ')', instance.title);
                        should_play_alarm = true;

                        error_counts.downs += 1;
                    } else {
                        icinga_notification(host.instance + '_host_' + host.name, 'clear');
                    }
                } else {
                    icinga_notification(host.instance + '_host_' + host.name, 'clear');
                }

                // check services on host
                Object.keys(host.services).forEach(function(s, s_i){
                    // $.each(Object.keys(host.services), function (s_i, s) {
                    let service = host.services[s];

                    // Possible OK WARNING UNKNOWN CRITICAL
                    // Something is wrong with that status
                    if ((service.status === 'WARNING' || service.status === 'CRITICAL') && (service.state_type === 'HARD' || !instance.hide_soft)) {
                        // Just if no downtime or acknowledged based on instance settings
                        if (!(service.down && instance.hide_down) && !(service.ack && instance.hide_ack)) {
                            // Notification for this service only if the host is not down, warning just when not ignored
                            if (host.status === 'UP' && (service.status !== 'WARNING' || (service.status === 'WARNING' && !instance.notf_nowarn))) {
                                icinga_notification(host.instance + '_service_' + host.name + '_' + service.name, 'Service Problem', host.name + ': ' + service.name + ' (' + service.status + ' - ' + service.state_type + ')', instance.title);
                                should_play_alarm = true;
                            }

                            if (service.status === 'WARNING') {
                                error_counts.warnings += 1;
                            } else {
                                error_counts.downs += 1;
                            }
                        } else {
                            icinga_notification(host.instance + '_service_' + host.name + '_' + service.name, 'clear');
                        }
                    } else {
                        if (service.status === 'UNKNOWN') {
                            // Unknown is always worth a count
                            error_counts.unknown += 1;
                        } else {
                            icinga_notification(host.instance + '_service_' + host.name + '_' + service.name, 'clear');
                        }
                    }
                });
            });

            // Badge
            if (error_counts.instance > 0) {
                icinga_badge('' + error_counts.instance, 'error');
            } else {
                if (error_counts.downs > 0) {
                    icinga_badge('' + error_counts.downs, 'down');
                } else {
                    if (error_counts.warnings > 0) {
                        icinga_badge('' + error_counts.warnings, 'warning');
                    } else {
                        icinga_badge('' + Object.keys(data.hosts).length, 'ok');
                    }
                }
            }

            // Alarm
            if (should_play_alarm === true) {
                icinga_alarm_play();
            } else {
                icinga_alarm_clear();
            }
        });
    });
}

function icinga_alarm_play()
{
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

        if (settings.alarm_file === "") {
            return;
        }

        let play = false;
        switch (settings.alarm_repeat) {
            case '':
                // once
                if (alarm_played_last_refresh === false) {
                    play = true;
                }
                break;
            case 'always':
                play = true;
                break;
            default:
                if (alarm_last_played_time === 0 || alarm_last_played_time <= Math.floor(Date.now()/1000) - (parseInt(settings.alarm_repeat) * 60)) {
                    play = true;
                }
                break;
        }

        if (play) {
            if (typeof Audio !== 'undefined') {
                let sound = new Audio(chrome.runtime.getURL('sounds/'+settings.alarm_file+'.mp3'));
                sound.play();
            } else {
                playSound(chrome.runtime.getURL('sounds/' + settings.alarm_file + '.mp3'));
            }

            alarm_played_last_refresh = true;
            alarm_last_played_time = Math.floor(Date.now() / 1000);
        }
    });
}
async function playSound(source = 'default.wav', volume = 1) {
    await createOffscreen();
    await chrome.runtime.sendMessage({ play: { source, volume } });
}
async function createOffscreen() {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'audio alarm playback on outages' // details for using the API
    });
}
function icinga_alarm_clear()
{
    alarm_played_last_refresh = false;
    alarm_last_played_time = 0;
}

function icinga_notification(id, title, message, context)
{
    if (title === 'clear') {
        // Clear it
        chrome.notifications.clear(id, function (id) {
        });
        let index = notf_store.indexOf(id);
        if (index >= 0) {
            notf_store.splice(index, 1);
        }
    } else {
        // Send it
        if (!notf_store.includes(id)) {
            notf_store.push(id);
            chrome.notifications.create(id, {
                'priority': 2,
                'type': 'basic',
                'iconUrl': chrome.runtime.getURL('/img/icon_black_64.png'),
                'title': title + ": " + context,
                'message': message
            }, function (id) {
            });
        }
    }
}

function icinga_badge(text, color_type)
{
    let color;

    switch (color_type) {
        case 'reload':
            color = [34, 175, 215, 128];
            break;
        case 'error':
            color = [166, 35, 215, 255];
            break;
        case 'ok':
            color = [0, 204, 51, 255];
            break;
        case 'unknown':
            color = [191, 68, 178, 255];
            break;
        case 'warning':
            color = [255, 165, 0, 255];
            break;
        case 'down':
            color = [255, 51, 0, 255];
            break;
    }

    chrome.action.setBadgeText({text: text});
    chrome.action.setBadgeBackgroundColor({color: color});
}

function icinga_fetch(icinga_type, url, username, password, type, instance)
{
    url = url.replace(/\/$/, '');

    let gurl;
    switch (icinga_type) {
        default:
            gurl = url + '/cgi-bin/status.cgi?style=hostservicedetail&jsonoutput';
            break;
        case 'icinga2_api':
            gurl = url + '/v1/status/IcingaApplication';
            break;
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

        fetch(gurl, { headers: new Headers({ 'Authorization': 'Basic '+btoa(username+':'+password)}) })
        .then(async function (res) {
            let error, text, icinga_data_host, icinga_data_service, icinga_version;
            const json = await res.json();

            switch (icinga_type) {
                default:
                    switch (res.status) {
                        default:
                            error = 'Unknown Error - Was not able to connect to your Icinga instance. Maybe you are using a self-signed SSL certificate that your browser is not trusting (yet)?';
                            break;
                        case 403:
                            error = 'Error 403 - Forbidden';
                            break;
                        case 404:
                            error = 'Error 404 - Bad URL';
                            break;
                        case 401:
                            error = 'Error 401 - Username/Password wrong';
                            break;
                        case 200:
                        case 204:
                            // Get Icinga Version
                            if (!json.cgi_json_version) {
                                error = 'Invalid Format from Icinga';
                            } else {
                                icinga_version = json.icinga_status.program_version;
                                icinga_data_service = json.status.service_status;
                                icinga_data_host = json.status.host_status;
                                text = 'OK - ' + icinga_data_host.length + ' hosts, ' + icinga_data_service.length + ' services (Icinga ' + icinga_version + ')';
                            }
                            break;
                    }

                    switch (type) {
                        case 'instance-check':
                            instance_save_return((error) ? {error: true, text: error} : {error: false, text: text});
                            break;

                        case 'refresh-background':
                            icingaData.setInstanceData((error) ? {
                                error: true,
                                text: error,
                                instance: instance
                            } : {
                                error: false,
                                text: text,
                                instance: instance,
                                hosts: icinga_data_host,
                                services: icinga_data_service
                            });
                            break;
                    }
                    break;
                case 'icinga2_api':
                    let no_return = false;

                    switch (res.status) {
                        default:
                            error = 'unknown error (HTTP status '+res.status+')';
                            break;
                        case 403:
                            error = 'Error 403 - Forbidden';
                            break;
                        case 404:
                            error = 'Error 404 - Bad URL';
                            break;
                        case 401:
                            error = 'Error 401 - Username/Password wrong';
                            break;
                        case 200:
                        case 204:
                            icinga_version = json.results[0].status.icingaapplication.app.version;
                            if (!icinga_version) {
                                error = 'Invalid Format from Icinga';
                            } else {
                                no_return = true;

                                const hostsR = await fetch(
                                    url + '/v1/objects/hosts?attrs=display_name&attrs=state&attrs=downtime_depth&attrs=state_type&attrs=acknowledgement&attrs=enable_notifications&attrs=name',
                                    { headers: new Headers({ 'Authorization': 'Basic '+btoa(username+':'+password) }) }
                                )
                                const hosts = await hostsR.json();

                                const servicesR = await fetch(
                                    url + '/v1/objects/services?attrs=display_name&attrs=state&attrs=downtime_depth&attrs=host_name&attrs=state_type&attrs=acknowledgement&attrs=enable_notifications&attrs=name',
                                    { headers: new Headers({ 'Authorization': 'Basic '+btoa(username+':'+password) }) }
                                )
                                const services = await servicesR.json();

                                icinga_data_host = [];
                                hosts.results.forEach(function (e) {
                                    icinga_data_host.push({
                                        host_name: e.name,
                                        status: (e.attrs.state === 1) ? 'DOWN' : 'UP',
                                        state_type: (e.attrs.state_type === 1) ? 'HARD' : 'SOFT',
                                        in_scheduled_downtime: (e.attrs.downtime_depth > 0),
                                        has_been_acknowledged: e.attrs.acknowledgement,
                                        notifications_enabled: e.attrs.enable_notifications,
                                    });
                                });

                                icinga_data_service = [];
                                services.results.forEach(function (e) {
                                    let state;
                                    switch (e.attrs.state) {
                                        case 0:
                                            state = 'OK';
                                            break;
                                        case 1:
                                            state = 'WARNING';
                                            break;
                                        case 2:
                                            state = 'CRITICAL';
                                            break;
                                        case 3:
                                            state = 'UNKNOWN';
                                            break;
                                    }
                                    icinga_data_service.push({
                                        host_name: e.attrs.host_name,
                                        service_description: e.attrs.display_name,
                                        service_display_name: e.attrs.display_name,
                                        service_name: e.attrs.name,
                                        status: state,
                                        state_type: (e.attrs.state_type === 1) ? 'HARD' : 'SOFT',
                                        in_scheduled_downtime: (e.attrs.downtime_depth > 0),
                                        has_been_acknowledged: e.attrs.acknowledgement,
                                        notifications_enabled: e.attrs.enable_notifications,
                                    });
                                });

                                text = 'OK - ' + icinga_data_host.length + ' hosts, ' + icinga_data_service.length + ' services (Icinga ' + icinga_version + ')';

                                switch (type) {
                                    case 'instance-check':
                                        instance_save_return((error) ? {
                                            error: true,
                                            text: error
                                        } : {error: false, text: text});
                                        break;

                                    case 'refresh-background':
                                        icingaData.setInstanceData((error) ? {
                                            error: true,
                                            text: error,
                                            instance: instance
                                        } : {
                                            error: false,
                                            text: text,
                                            instance: instance,
                                            hosts: icinga_data_host,
                                            services: icinga_data_service
                                        });
                                        break;
                                }
                            }
                            break;
                    }

                    if (!no_return) {
                        switch (type) {
                            case 'instance-check':
                                instance_save_return((error) ? {error: true, text: error} : {
                                    error: false,
                                    text: text
                                });
                                break;

                            case 'refresh-background':
                                icingaData.setInstanceData((error) ? {
                                    error: true,
                                    text: error,
                                    instance: instance
                                } : {
                                    error: false,
                                    text: text,
                                    instance: instance,
                                    hosts: icinga_data_host,
                                    services: icinga_data_service
                                });
                                break;
                        }
                    }
                    break;
            }
        })
        .catch(function (err) {
            switch (type) {
                case 'instance-check':
                    instance_save_return({error: true, text: err});
                    break;

                case 'refresh-background':
                    icingaData.setInstanceData({error: true, text: err});
                    break;
            }
        });
    });
}

function icinga_get_instances(callback)
{
    // Migrate old instances
    try {
        if (localStorage.getItem('instances') !== null) {
            chrome.storage.local.set({'instances': JSON.parse(localStorage.getItem('instances'))});
            localStorage.setItem('instances_old', localStorage.getItem('instances'));
            localStorage.removeItem('instances');
        }
    } catch (l) {
    }

    chrome.storage.local.get('instances', callback);
}

function icinga_set_instances(instances)
{
    let real_instances = [];
    for (i = 0; i < instances.length; i++) {
        let e = instances[i];
        if (e != null) {
            real_instances.push(e);
        }
    }

    chrome.storage.local.set({'instances': real_instances});
}

const default_settings = {
    'refresh': 60,
    'ack_expire': 0,
    'ack_persistent': 0,
    'ack_sticky': 0,
    'ack_author': 'icinga-multi-status',
    'alarm_file': '',
    'alarm_repeat': '',
};

function icinga_get_settings(callback)
{
    // Migrate old settings
    try {
        if (localStorage.getItem('settings') !== null) {
            chrome.storage.local.set({'settings': JSON.parse(localStorage.getItem('settings'))});
            localStorage.setItem('settings_old', localStorage.getItem('settings'));
            localStorage.removeItem('settings');
        }
    } catch (l) {
    }

    chrome.storage.local.get('settings', callback);
}

function icinga_recheck(type, instance_i, host_name, service_name = '')
{
    // Get instance settings
    icinga_get_instances((instances) => {
        let instance = instances.instances[instance_i];
        if (instance.icinga_type !== 'icinga2_api') {
            return;
        }

        let payload, payload_for;
        switch (type) {
            case 'host':
                payload = {type: "Host", filter: "host.name==\"" + host_name + "\""};
                payload_for = host_name;
                break;
            case 'service':
                payload = {
                    type: "Service",
                    filter: "host.name\=\=\"" + host_name + "\" && service.name\=\=\"" + service_name + "\""
                };
                payload_for = host_name + '[' + service_name + ']';
                break;
        }

        $.ajax({
            username: instance.user,
            password: instance.pass,
            global: false,
            timeout: 10000,
            url: instance.url.replace(/\/$/, '') + '/v1/actions/reschedule-check',
            method: 'POST',
            data: JSON.stringify(payload),
            headers: {'Accept': 'application/json'},
            complete: function (res) {
                let downs = $('#popup-tab-overview-downs');

                if (res.status === 200) {
                    downs.append('<div class="alert alert-success alert-dismissible fade show" role="alert">' +
                        '  Rescheduled check for ' + payload_for +
                        '  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                        '</div>');
                    return;
                }

                downs.append('<div class="alert alert-error alert-dismissible fade show" role="alert">' +
                    '  <strong>Error Rescheduling Check</strong> <span class="alert-error-info"></span>' +
                    '  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                    '</div>');
                $('#popup-tab-overview-downs .alert-error-info').text('(' + parseInt(res.status) + ') ' + JSON.stringify(res));
            }
        });
    });
}

function icinga_acknowledge(type, instance_i, host_name, service_name = '')
{
    // Get instance settings
    icinga_get_instances((instances) => {
        let instance = instances.instances[instance_i];
        if (instance.icinga_type !== 'icinga2_api') {
            return;
        }

        icinga_get_settings((settings) => {
            let defaults = [];
            defaults['ack_expire'] = (instance.ack_expire == -1) ? (settings.ack_expire || default_settings.ack_expire) : instance.ack_expire;
            defaults['ack_persistent'] = (instance.ack_persistent == -1) ? (settings.ack_persistent || default_settings.ack_persistent) : instance.ack_persistent;
            defaults['ack_sticky'] = (instance.ack_sticky == -1) ? (settings.ack_sticky || default_settings.ack_sticky) : instance.ack_sticky;
            defaults['ack_author'] = (instance.ack_author === "") ? (settings.ack_author || default_settings.ack_author) : instance.ack_author;

            let ack_services = $('#ack-services');
            let payload_for;
            switch (type) {
                case 'host':
                    payload_for = host_name;
                    ack_services.prop('checked', false);
                    ack_services.parents('.checkbox').show();
                    break;
                case 'service':
                    payload_for = host_name + '[' + service_name + ']';
                    ack_services.parents('.checkbox').hide();
                    break;
            }

            // Modal
            $('#ack-alert').hide();
            $('#modal_ack h5').html('Acknowledge - ' + payload_for);
            $('#ack-expire').val(defaults['ack_expire']);
            $('#ack-persistent').val(defaults['ack_persistent']);
            $('#ack-sticky').val(defaults['ack_sticky']);
            $('#ack-author').val(defaults['ack_author']);
            $('#modal_ack')
                .on('show.bs.modal', () => {
                    $('body').css('min-height', '600px');
                })
                .on('hidden.bs.modal', () => {
                    $('body').css('min-height', '');
                });
            document.getElementById('modal_ack').showModal();
            $('#ack-submit').off('click').on('click', () => {
                $('#ack-submit').prop('disabled', true);

                let payload = [];
                let author = $('#ack-author').val();
                let comment = $('#ack-comment').val();
                let expiry = parseInt(Math.round((Date.now() / 1000)) + $('#ack-expire').val());
                let sticky = $('#ack-sticky').prop('checked');
                let persistent = $('#ack-persistent').prop('checked');

                switch (type) {
                    case 'host':
                        payload.push({
                            type: "Host",
                            filter: "host.name==\"" + host_name + "\"",
                            author: author,
                            comment: comment,
                            expiry: expiry,
                            sticky: sticky,
                            persistent: persistent,
                            notify: true
                        });

                        if ($('#ack-services').prop('checked')) {
                            payload.push({
                                type: "Service",
                                filter: "service.state>0 && host.name==\"" + host_name + "\"",
                                author: author,
                                comment: comment,
                                expiry: expiry,
                                sticky: sticky,
                                persistent: persistent,
                                notify: true
                            });
                        }
                        break;
                    case 'service':
                        payload.push({
                            type: "Service",
                            filter: "host.name\=\=\"" + host_name + "\" && service.name\=\=\"" + service_name + "\"",
                            author: author,
                            comment: comment,
                            expiry: expiry,
                            sticky: sticky,
                            persistent: persistent,
                            notify: true
                        });
                        break;
                }

                payload.forEach((p) => {
                    $.ajax({
                        username: instance.user,
                        password: instance.pass,
                        global: false,
                        timeout: 10000,
                        url: instance.url.replace(/\/$/, '') + '/v1/actions/acknowledge-problem',
                        method: 'POST',
                        data: JSON.stringify(p),
                        headers: {'Accept': 'application/json'},
                        complete: function (res) {
                            let ack_alert = $('#ack-alert');

                            if (res.status === 200) {
                                ack_alert.show().append('<div class="alert alert-success alert-dismissible fade show" role="alert">' +
                                    '  Problem acknowledged for ' + payload_for +
                                    '  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                                    '</div>');
                                setTimeout(() => {
                                    $('#modal_ack').modal('hide');
                                }, 2000);
                                return;
                            }

                            ack_alert.show().append('<div class="alert alert-error alert-dismissible fade show" role="alert">' +
                                '  <strong>Error Problem Acknowledgement</strong> <span class="alert-error-info"></span>' +
                                '  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                                '</div>');
                            $('#ack-alert .alert-error-info').text('(' + parseInt(res.status) + ') ' + JSON.stringify(res));
                        }
                    });
                });
            });
        });
    });
}
