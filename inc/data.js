const icingaData = {
    data_hosts: {},
    data_raw: [],
    checks: [],

    init: function(){
    },

    refresh: function(){
        icinga_get_instances(function (instances) {
            instances = instances.instances;

            if (instances == null) {
                instances = [];
            }

            if (instances.length) {
                icinga_badge('...', 'reload');

                icingaData.checks = [];
                icingaData.data_raw = [];

                for (i = 0; i < instances.length; i++) {
                    let e = instances[i];
                    if (e.active) {
                        icingaData.checks[i] = false;
                        icinga_fetch(e.icinga_type, e.url, e.user, e.pass, 'refresh-background', i);
                    }
                }

                setTimeout(function () {
                    icingaData.refreshDone();
                }, 1000);
            } else {
                icinga_badge('', 'reload');
            }
        });
    },

    refreshDone: function() {
        let all_done = true;
        for (let i = 0; i <= icingaData.checks.length; i++) {
            if (icingaData.checks[i] === false) {
                all_done = false;
                break;
            }
        }

        if (all_done) {
            icingaData.checks = [];
            icingaData.data_hosts = {};

            icinga_get_instances(function (instances) {
                instances = instances.instances;

                if (instances == null) {
                    instances = [];
                }

                for (let i = 0; i < icingaData.data_raw.length; i++) {
                    let e = icingaData.data_raw[i];

                    if (typeof e != 'undefined') {
                        if (!e.error) {
                            let regexp_hosts, regexp_services;
                            // RegExp for hiding
                            if (instances[i].hide_hosts) {
                                regexp_hosts = new RegExp(instances[i].hide_hosts, 'i');
                            }
                            if (instances[i].hide_services) {
                                regexp_services = new RegExp(instances[i].hide_services, 'i');
                            }

                            // Go through all hosts and services and build object
                            // If set hide hosts or hide services, ignore then
                            for (let i_h = 0; i_h < e.hosts.length; i_h++) {
                                let host = e.hosts[i_h];

                                // Check host if regexp
                                let add_host = false;
                                if (instances[i].hide_hosts) {
                                    if (!regexp_hosts.test(host.host_name)) {
                                        add_host = true;
                                    }
                                } else {
                                    add_host = true;
                                }

                                if (add_host) {
                                    icingaData.data_hosts[i + '_' + host.host_name] = {
                                        'instance': i,
                                        'name': host.host_name,
                                        'status': host.status,
                                        'state_type': host.state_type,
                                        'down': host.in_scheduled_downtime,
                                        'ack': host.has_been_acknowledged,
                                        'notify': host.notifications_enabled,
                                        'services': {}
                                    };
                                }
                            }

                            for (let i_s = 0; i_s < e.services.length; i_s++) {
                                let service = e.services[i_s];

                                if (icingaData.data_hosts[i + '_' + service.host_name]) {
                                    // Check service if regexp
                                    let add_service = false;
                                    if (instances[i].hide_services) {
                                        if (!regexp_services.test(service.service_description)) {
                                            add_service = true;
                                        }
                                    } else {
                                        add_service = true;
                                    }

                                    if (add_service) {
                                        icingaData.data_hosts[i + '_' + service.host_name].services[service.service_description] = {
                                            'name': service.service_display_name,
                                            'sname': (typeof (service.service_name) !== 'undefined') ? service.service_name : service.service_display_name,
                                            'status': service.status,
                                            'state_type': service.state_type,
                                            'down': service.in_scheduled_downtime,
                                            'ack': service.has_been_acknowledged,
                                            'notify': service.notifications_enabled
                                        };
                                    }
                                }
                            }
                        }

                        // Update last status + error
                        instances[i].error = e.error;
                        instances[i].status_last = e.text;
                    }
                }

                icinga_set_instances(instances);

                icingaData.data_raw = [];
                icingaData.setHosts();
                icinga_check();
            });
        } else {
            setTimeout(function () {
                icingaData.refreshDone();
            }, 500);
        }
    },

    setInstanceData: function(e){
        icingaData.checks[e.instance] = true;
        icingaData.data_raw[e.instance] = e;
    },

    setHosts: function(){
        chrome.storage.local.set({'hosts': icingaData.data_hosts});
    },

    getHosts: function(callback){
        chrome.storage.local.get('hosts', callback);
    },
}
