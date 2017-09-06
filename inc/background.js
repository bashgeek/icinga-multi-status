var bg = {
	version: 0.1,
	data_hosts: {},
	data_raw: [],
	timer: undefined,
	checks: [],

	init: function() {
		bg.refreshData();
		bg.listener();
	},

	// Refresh data for all icinga instances
	refreshData: function() {
		if (bg.timer != undefined)
			clearTimeout(bg.timer);

		var instances = icinga_get_instances();
		if (instances.length) {
			icinga_badge('...', 'reload');

			bg.checks=[];
			bg.data_raw=[];

			for(i=0; i<instances.length; i++) {
				var e = instances[i];
				if (e.active) {
					bg.checks[i] = false;
					icinga_fetch(e.icinga_type, e.url, e.user, e.pass, 'refresh-background', i);
				}
			}

			setTimeout(function(){ bg.refreshData_done(); }, 1000);
		} else {
			icinga_badge('', 'reload');
		}

		bg.restartTimer();
	},

	refreshData_return: function(e) {
		bg.checks[e.instance] = true;
		bg.data_raw[e.instance] = e;
	},

	refreshData_done: function() {
		var all_done = true;
		for(i=0; i<=bg.checks.length; i++) {
			if (bg.checks[i] == false)
				all_done = false;
		}

		if (all_done) {
			bg.checks=[];
			bg.data_hosts={};

			var instances = icinga_get_instances();

			for(i=0; i<bg.data_raw.length; i++) {
				var e = bg.data_raw[i];

				if (typeof e != 'undefined') {
					if (!e.error) {
						// RegExp for hiding
						if (instances[i].hide_hosts) {
							regexp_hosts = new RegExp(instances[i].hide_hosts, 'i');
						}
						if (instances[i].hide_services) {
							regexp_services = new RegExp(instances[i].hide_services, 'i');
						}

						// Go through all hosts and services and build object
						// If set hide hosts or hide services, ignore then
						for (i_h=0; i_h<e.hosts.length; i_h++) {
							var host = e.hosts[i_h];

							// Check host if regexp
							var add_host = false;
							if (instances[i].hide_hosts) {
								if (!regexp_hosts.test(host.host_name))
									add_host = true;
							} else {
								add_host = true;
							}

							if (add_host) {
								bg.data_hosts[i+'_'+host.host_name] = {
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

							delete add_host;
							delete host;
						}

						for (i_s=0; i_s<e.services.length; i_s++) {
							var service = e.services[i_s];

							if (bg.data_hosts[i+'_'+service.host_name]) {
								// Check service if regexp
								var add_service = false;
								if (instances[i].hide_services) {
									if (!regexp_services.test(service.service_description))
										add_service = true;
								} else {
									add_service = true;
								}

								if (add_service) {
									bg.data_hosts[i+'_'+service.host_name].services[service.service_description] = {
										'name': service.service_display_name,
										'sname': (typeof(service.service_name) !== 'undefined') ? service.service_name : service.service_display_name,
										'status': service.status,
										'state_type': service.state_type,
										'down': service.in_scheduled_downtime,
										'ack': service.has_been_acknowledged,
										'notify': host.notifications_enabled
									};
								}
							}

							delete service;
							delete add_service;
						}
					}

					// Update last status + error
					instances[i].error = e.error;
					instances[i].status_last = e.text;
				}

				delete regexp_hosts;
				delete regexp_services;
			}

			icinga_set_instances(instances);

			bg.data_raw=[];
			icinga_check();
			bg.restartTimer();
		} else {
			setTimeout(function(){ bg.refreshData_done(); }, 500);
		}
	},

	// Restart refresh timer
	restartTimer: function() {
		if (bg.timer != undefined)
			clearInterval(bg.timer);

		var settings = icinga_get_settings();
		var interval = (settings.refresh == undefined) ? 30000 : settings.refresh*1000;

		bg.timer = setTimeout(function() { bg.refreshData(); }, interval);
	},

	// Bind Request Listener
	listener: function() {
		browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
			switch(request.request) {
				case 'data':
					sendResponse({ 'state': 'ok', 'hosts': bg.data_hosts });
				break;

				default: sendResponse({state: false, error: 'Unknown request'}); break;
			}
		});
	},
};

bg.init();