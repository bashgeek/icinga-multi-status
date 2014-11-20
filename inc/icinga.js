
	// @todo: acknowledge push function
	// @todo: recheck push function

	function icinga_check() {
		// Errors
		var error_counts = { instance: 0, warnings: 0, downs: 0, unknown: 0 };

		// Check for instance errors
		var instances = icinga_get_instances();
		if (instances.length) {
			for(i=0; i<instances.length; i++) {
				var e = instances[i];
				if (e.active) {
					if (e.error) {
						error_counts.instance += 1;
					}
				}
			}
		}

		if (Object.keys(bg.data_hosts).length) {
			// Go through hosts
			$.each(Object.keys(bg.data_hosts), function(h_i,h) {
				var host = bg.data_hosts[h];
				var instance = instances[host.instance];

				// something is wrong with host != UP && != PENDING
				// Possible DOWN UNREACHABLE UP
				if (host.status == 'DOWN' || host.status == 'UNREACHABLE') {
					// Just if no downtime or acknowleged based on instance settings
					if (!(host.down && instance.hide_down) && !(host.ack && instance.hide_ack)) {
						icinga_notification(host.instance+'_host_'+host.name, 'Host Problem', host.name+' ('+host.status+')', instance.title);

						error_counts.downs += 1;
					} else {
						icinga_notification(host.instance+'_host_'+host.name, 'clear');
					}
				} else {
					icinga_notification(host.instance+'_host_'+host.name, 'clear');
				}

				// check services on host
				$.each(Object.keys(host.services), function(s_i,s) {
					var service = host.services[s];
					
					// Possible OK WARNING UNKNOWN CRITICAL
					// Something is wrong with that status
					if (service.status == 'WARNING' || service.status == 'CRITICAL') {
						// Just if no downtime or acknowleged based on instance settings
						if (!(service.down && instance.hide_down) && !(service.ack && instance.hide_ack)) {
							// Notification for this service only if the host is not down, warning just when not ignored
							if (host.status == 'UP' && (service.status != 'WARNING' || (service.status == 'WARNING' && !instance.notf_nowarn))) {
								icinga_notification(host.instance+'_service_'+host.name+'_'+service.name, 'Service Problem', host.name+': '+service.name+' ('+service.status+')', instance.title);
							}

							if (service.status == 'WARNING')
								error_counts.warnings += 1;
							else
								error_counts.downs += 1;
						} else {
							icinga_notification(host.instance+'_service_'+host.name+'_'+service.name, 'clear');
						}
					} else if (service.status == 'UNKNOWN') {
						// Unknown is always worth a count
						error_counts.unknown += 1;
					} else {
						icinga_notification(host.instance+'_service_'+host.name+'_'+service.name, 'clear');
					}
				});
			});
		}

		// Badge
		if (error_counts.instance > 0) {
			icinga_badge(''+error_counts.instance, 'error');
		} else {
			if (error_counts.downs > 0) {
				icinga_badge(''+error_counts.downs, 'down');
			} else {
				if (error_counts.warnings > 0) {
					icinga_badge(''+error_counts.warnings, 'warning');
				} else {
					icinga_badge(''+Object.keys(bg.data_hosts).length, 'ok');
				}
			}
		}
	}

	function icinga_notification(id, title, message, context) {
		chrome.notifications.getPermissionLevel(function(e) {
			if (e == 'granted') {
				if (title == 'clear') {
					// Clear it
					chrome.notifications.clear(id, function(id) {});
				} else {
					// Send it
					chrome.notifications.create(id, { 'priority': 2, 'type': 'basic', 'iconUrl': 'img/icon_48.png', 'title': title, 'contextMessage': context, 'message': message }, function(id) {});
				}
			}
		});
	}

	function icinga_badge(text, color) {
		switch(color) {
			case 'reload': var color = [34,175,215,128]; break;
			case 'error': var color = [166,35,215,255]; break;
			case 'ok': var color = [0,204,51,255]; break;
			case 'unknown': var color = [191,68,178,255]; break;
			case 'warning': var color = [255,165,0,255]; break;
			case 'down': var color = [255,51,0,255]; break;
		}

		chrome.browserAction.setBadgeText({text: text});
		chrome.browserAction.setBadgeBackgroundColor({color: color});
	}

	function icinga_fetch(url, username, password, type, instance) {
		var url = url.replace(/\/$/, '');

		$.ajax({
			username: username,
			password: password,
			global: false,
			timeout: 10000,
			url: url+'/cgi-bin/status.cgi?style=hostservicedetail&jsonoutput',
			error: function(res, status, error) {
				switch (type) {
					case 'instance-check':
						instance_save_return({ error: true, text: status+' '+error });
					break;

					case 'refresh-background':
						bg.refreshData_return({ error: true, text: status+' '+error });
					break;
				}
			},
			complete: function (res, status) {
				switch (res.status) {
					default: var error = 'unknown error'; break;
					case 403: var error = 'Error 403 - Forbidden'; break;
					case 404: var error = 'Error 404 - Bad URL'; break;
					case 401: var error = 'Error 401 - Username/Password wrong'; break;
					case 200:
						if ((status === "success" || status === "notmodified")) {
							// Get Icinga Version
							var json = jQuery.parseJSON(res.responseText);
							if (!json.cgi_json_version) {
								var error = 'Invalid Format from Icinga';
							} else {
								var icinga_version = json.icinga_status.program_version;
								var icinga_data_service = json.status.service_status;
								var icinga_data_host = json.status.host_status;
								var text = 'OK - '+icinga_data_host.length+' hosts, '+icinga_data_service.length+' services (Icinga '+icinga_version+')';
							}
						} else {
							var error = status;
						}
					break;
				}

				switch (type) {
					case 'instance-check':
						instance_save_return((error) ? { error: true, text: error } : { error: false, text: text });
					break;

					case 'refresh-background':
						bg.refreshData_return((error) ? { error: true, text: error, instance: instance } : { error: false, text: text, instance: instance, hosts: icinga_data_host, services: icinga_data_service });
					break;
				}

				delete icinga_data_service;
				delete icinga_data_host;
				delete res;
				delete text;
				delete error;
			}
		});
	}

	function icinga_get_instances() {
		try {
			var instances = JSON.parse(localStorage.getItem('instances'));
			if (instances == null)
				instances = [];
		} catch(l) { var instances = []; }

		return instances;
	}

	function icinga_set_instances(instances) {
		var real_instances = [];
		for(i=0; i<instances.length; i++) {
			var e = instances[i];
			if (e != null) {
				real_instances.push(e);
			}
		}
		localStorage.setItem('instances', JSON.stringify(real_instances));
	}

	default_settings = {
		'refresh': 60
	};

	function icinga_set_setting(setting,value) {
		var settings = icinga_get_settings();
		settings[setting] = value;

		localStorage.setItem('settings', JSON.stringify(settings));
	}

	function icinga_get_settings() {
		try {
			var real_settings = default_settings;

			var settings = JSON.parse(localStorage.getItem('settings'));
			if (settings == null) {
				settings = default_settings;
			} else {
				$.each(settings, function(k,v) { real_settings[k] = v; });
				settings = default_settings;
			}
		} catch(l) { var settings = default_settings; }

		return settings;
	}

