
	function icinga_check() {
		// Errors
		var error_counts = { instance: 0, warnings: 0, downs: 0, unknown: 0 };

		// Check for instance errors
		icinga_get_instances(function (instances) {
			instances = instances.instances;

			if (instances == null) {
				instances = [];
			}

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
						if (!(host.down && instance.hide_down) && !(host.ack && instance.hide_ack) && !(host.state_type == 'SOFT' && instance.hide_soft)) {
							icinga_notification(host.instance+'_host_'+host.name, 'Host Problem', host.name+' ('+host.status+' - '+host.state_type+')', instance.title);

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
						if ((service.status == 'WARNING' || service.status == 'CRITICAL') && (service.state_type == 'HARD' || !instance.hide_soft)) {
							// Just if no downtime or acknowleged based on instance settings
							if (!(service.down && instance.hide_down) && !(service.ack && instance.hide_ack)) {
								// Notification for this service only if the host is not down, warning just when not ignored
								if (host.status == 'UP' && (service.status != 'WARNING' || (service.status == 'WARNING' && !instance.notf_nowarn))) {
									icinga_notification(host.instance+'_service_'+host.name+'_'+service.name, 'Service Problem', host.name+': '+service.name+' ('+service.status+' - '+service.state_type+')', instance.title);
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
		});
	}

	var notf_store = [];
	function icinga_notification(id, title, message, context) {
		if (chrome.notifications && chrome.notifications.getPermissionLevel) {
			chrome.notifications.getPermissionLevel(function(e) {
				if (e == 'granted') {
					if (title == 'clear') {
						// Clear it
						chrome.notifications.clear(id, function(id) {});
						notf_store = $.grep(notf_store, function(v) {
							return v != id;
						});
					} else {
						// Send it
						if ($.inArray(id, notf_store) == -1) {
							notf_store.push(id);
							chrome.notifications.create(id, { 'priority': 2, 'type': 'basic', 'iconUrl': 'img/icon_48.png', 'title': title, 'contextMessage': context, 'message': message }, function(id) { });
						}
					}
				}
			});
		}
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

	function icinga_fetch(icinga_type, url, username, password, type, instance) {
		var url = url.replace(/\/$/, '');

		switch(icinga_type) {
			default: var gurl = url+'/cgi-bin/status.cgi?style=hostservicedetail&jsonoutput'; break;
			case 'icinga2_api': var gurl = url+'/v1/status/IcingaApplication'; break;
		}

		icinga_get_settings(function (settings) {
			settings = settings.settings;
			var real_settings = default_settings;

			if (settings == null) {
				settings = default_settings;
            } else {
				$.each(settings, function (k, v) {
					real_settings[k] = v;
				});
				settings = default_settings;
            }

			var interval = Math.round(((settings.refresh == undefined) ? 30000 : settings.refresh*1000) / 2);

			$.ajax({
				username: username,
				password: password,
				global: false,
				timeout: interval,
				url: gurl,
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
					switch (icinga_type) {
						default:
							switch (res.status) {
								default: var error = 'Unknown Error - Was not able to connect to your Icinga instance. Maybe you are using a self-signed SSL certificate that your browser is not trusting (yet)?'; break;
								case 403: var error = 'Error 403 - Forbidden'; break;
								case 404: var error = 'Error 404 - Bad URL'; break;
								case 401: var error = 'Error 401 - Username/Password wrong'; break;
								case 200:
									if ((status === "success" || status === "notmodified")) {
										var json = jQuery.parseJSON(res.responseText);

										// Get Icinga Version
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
						break;
						case 'icinga2_api':
							switch (res.status) {
								default: var error = 'unknown error'; break;
								case 403: var error = 'Error 403 - Forbidden'; break;
								case 404: var error = 'Error 404 - Bad URL'; break;
								case 401: var error = 'Error 401 - Username/Password wrong'; break;
								case 200:
									if ((status === "success" || status === "notmodified")) {
										var json = jQuery.parseJSON(res.responseText);
										var icinga_version = json.results[0].status.icingaapplication.app.version;
										if (!icinga_version) {
											var error = 'Invalid Format from Icinga';
										} else {
											var no_return = true;

											$.when(
												$.ajax({
													username: username,
													password: password,
													global: false,
													timeout: interval,
													url: url+'/v1/objects/hosts?attrs=display_name&attrs=state&attrs=downtime_depth&attrs=state_type&attrs=acknowledgement&attrs=enable_notifications&attrs=name'
												}),
												$.ajax({
													username: username,
													password: password,
													global: false,
													timeout: interval,
													url: url+'/v1/objects/services?attrs=display_name&attrs=state&attrs=downtime_depth&attrs=host_name&attrs=state_type&attrs=acknowledgement&attrs=enable_notifications&attrs=name'
												})
											).then(function(hosts,services) {
												var icinga_data_host = [];
												$.each(hosts[0].results, function(i,e){
													icinga_data_host.push({
														host_name: e.name,
														status: (e.attrs.state == 1) ? 'DOWN' : 'UP',
														state_type: (e.attrs.state_type == 1) ? 'HARD' : 'SOFT',
														in_scheduled_downtime: (e.attrs.downtime_depth > 0) ? true : false,
														has_been_acknowledged: e.attrs.acknowledgement,
														notifications_enabled: e.attrs.enable_notifications,
													});
												});

												var icinga_data_service = [];
												$.each(services[0].results, function(i,e){
													switch (e.attrs.state) {
														case 0: var state = 'OK'; break;
														case 1: var state = 'WARNING'; break;
														case 2: var state = 'CRITICAL'; break;
														case 3: var state = 'UNKNOWN'; break;
													}
													icinga_data_service.push({
														host_name: e.attrs.host_name,
														service_description: e.attrs.display_name,
														service_display_name: e.attrs.display_name,
														service_name: e.attrs.name,
														status: state,
														state_type: (e.attrs.state_type == 1) ? 'HARD' : 'SOFT',
														in_scheduled_downtime: (e.attrs.downtime_depth > 0) ? true : false,
														has_been_acknowledged: e.attrs.acknowledgement,
														notifications_enabled: e.attrs.enable_notifications,
													});
												});

												var text = 'OK - '+icinga_data_host.length+' hosts, '+icinga_data_service.length+' services (Icinga '+icinga_version+')';

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
											});
										}
									} else {
										var error = status;
									}
								break;
							}

							if (!no_return) {
								switch (type) {
									case 'instance-check':
										instance_save_return((error) ? { error: true, text: error } : { error: false, text: text });
									break;

									case 'refresh-background':
										bg.refreshData_return((error) ? { error: true, text: error, instance: instance } : { error: false, text: text, instance: instance, hosts: icinga_data_host, services: icinga_data_service });
									break;
								}
							}
						break;
					}
				}
			});
		});
	}

	function icinga_get_instances(callback) {
		// Migrate old instances
		try {
			if (localStorage.getItem('instances') !== null) {
				console.log('Found old instances, migrating', localStorage.getItem('instances'))
				chrome.storage.local.set({'instances': JSON.parse(localStorage.getItem('instances'))});
				localStorage.setItem('instances_old', localStorage.getItem('instances'));
				localStorage.removeItem('instances');
			}
		} catch(l) {
		}

		chrome.storage.local.get('instances', callback);
	}

	function icinga_set_instances(instances) {
		var real_instances = [];
		for(i=0; i<instances.length; i++) {
			var e = instances[i];
			if (e != null) {
				real_instances.push(e);
			}
		}

		chrome.storage.local.set({'instances': real_instances});
	}

	default_settings = {
		'refresh': 60,
		'ack_expire': 0,
		'ack_persistent': 0,
		'ack_sticky': 0,
		'ack_author': 'icinga-multi-status',
	};

	function icinga_set_setting(setting,value) {
		icinga_get_settings(function (settings) {
			settings = settings.settings;

			var real_settings = default_settings;

			if (settings == null) {
				settings = default_settings;
			} else {
				$.each(settings, function (k, v) {
					real_settings[k] = v;
				});
				settings = default_settings;
			}

			settings[setting] = value;

			chrome.storage.local.set({'settings': settings});
		});
	}

	function icinga_get_settings(callback) {
		// Migrate old settings
		try {
			if (localStorage.getItem('settings') !== null) {
				console.log('Found old settings, migrating', localStorage.getItem('settings'))
				chrome.storage.local.set({'settings': JSON.parse(localStorage.getItem('settings'))});
				localStorage.setItem('settings_old', localStorage.getItem('settings'));
				localStorage.removeItem('settings');
			}
		} catch(l) {
		}

		chrome.storage.local.get('settings', callback);
	}

	function icinga_recheck(type, instance_i, host_name, service_name='') {
		// Get instance settings
		icinga_get_instances((instances)=>{
			let instance = instances.instances[instance_i];
			if (instance.icinga_type !== 'icinga2_api') {
				return;
			}

			let payload, payload_for;
			switch (type) {
				case 'host':
					payload = {type:"Host",filter:"host.name==\""+host_name+"\""};
					payload_for = host_name;
					break;
				case 'service':
					payload = {type:"Service",filter:"host.name\=\=\""+host_name+"\" && service.name\=\=\""+service_name+"\""};
					payload_for = host_name+'['+service_name+']';
					break;
			}

			$.ajax({
				username: instance.user,
				password: instance.pass,
				global: false,
				timeout: 10000,
				url: instance.url.replace(/\/$/, '')+'/v1/actions/reschedule-check',
				method: 'POST',
				data: JSON.stringify(payload),
				headers: {'Accept': 'application/json'},
				complete: function (res) {
					if (res.status === 200) {
						$('#popup-tab-overview-downs').append('<div class="alert alert-success alert-dismissible fade show" role="alert">' +
						'  Rescheduled check for '+payload_for +
						'  <button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
						'    <span aria-hidden="true">&times;</span>' +
						'  </button>' +
						'</div>');
						return;
					}

					$('#popup-tab-overview-downs').append('<div class="alert alert-danger alert-dismissible fade show" role="alert">' +
					'  <strong>Error Rescheduling Check</strong> ('+res.status+') - '+JSON.stringify(res)+'' +
					'  <button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
					'    <span aria-hidden="true">&times;</span>' +
					'  </button>' +
					'</div>');
				}
			});
		});
	}

	function icinga_acknowledge(type, instance_i, host_name, service_name='') {
		// Get instance settings
		icinga_get_instances((instances)=>{
			let instance = instances.instances[instance_i];
			if (instance.icinga_type !== 'icinga2_api') {
				return;
			}

			icinga_get_settings((settings)=>{
				let defaults = [];
				defaults['ack_expire'] = (instance.ack_expire == -1) ? (settings.ack_expire ?? default_settings.ack_expire) : instance.ack_expire;
				defaults['ack_persistent'] = (instance.ack_persistent == -1) ? (settings.ack_persistent ?? default_settings.ack_persistent) : instance.ack_persistent;
				defaults['ack_sticky'] = (instance.ack_sticky == -1) ? (settings.ack_sticky ?? default_settings.ack_sticky) : instance.ack_sticky;
				defaults['ack_author'] = (instance.ack_author == "") ? (settings.ack_author ?? default_settings.ack_author) : instance.ack_author;

				let payload_for;
				switch (type) {
					case 'host':
						payload_for = host_name;
						$('#ack-services').prop('checked', false);
						$('#ack-services').parents('.checkbox').show();
						break;
					case 'service':
						payload_for = host_name+'['+service_name+']';
						$('#ack-services').parents('.checkbox').hide();
						break;
				}

				// Modal
				$('#ack-alert').hide();
				$('#modal_ack h5').html('Acknowledge - '+payload_for);
				$('#ack-expire').val(defaults['ack_expire']);
				$('#ack-persistent').val(defaults['ack_persistent']);
				$('#ack-sticky').val(defaults['ack_sticky']);
				$('#ack-author').val(defaults['ack_author']);
				$('#modal_ack')
					.on('show.bs.modal', ()=>{ $('body').css('min-height', '600px'); })
					.on('hidden.bs.modal', ()=>{ $('body').css('min-height', ''); })
					.modal();
				$('#ack-submit').off('click').on('click', ()=>{
					$('#ack-submit').prop('disabled', true);

					let payload=[];
					let author = $('#ack-author').val();
					let comment = $('#ack-comment').val();
					let expiry = parseInt(Math.round((Date.now()/1000)) + $('#ack-expire').val());
					let sticky = $('#ack-sticky').prop('checked');
					let persistent = $('#ack-persistent').prop('checked');

					switch (type) {
						case 'host':
							payload.push({type:"Host",filter:"host.name==\""+host_name+"\"",author:author,comment:comment,expiry:expiry,sticky:sticky,persistent:persistent,notify:true});

							if ($('#ack-services').prop('checked')) {
								payload.push({type:"Service",filter:"service.state>0 && host.name==\""+host_name+"\"",author:author,comment:comment,expiry:expiry,sticky:sticky,persistent:persistent,notify:true});
							}
							break;
						case 'service':
							payload.push({type:"Service",filter:"host.name\=\=\""+host_name+"\" && service.name\=\=\""+service_name+"\"",author:author,comment:comment,expiry:expiry,sticky:sticky,persistent:persistent,notify:true});
							break;
					}

					payload.forEach((p)=>{
						$.ajax({
							username: instance.user,
							password: instance.pass,
							global: false,
							timeout: 10000,
							url: instance.url.replace(/\/$/, '')+'/v1/actions/acknowledge-problem',
							method: 'POST',
							data: JSON.stringify(p),
							headers: {'Accept': 'application/json'},
							complete: function (res) {
								if (res.status === 200) {
									$('#ack-alert').show().append('<div class="alert alert-success alert-dismissible fade show" role="alert">' +
										'  Problem acknowledged for '+payload_for +
										'  <button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
										'    <span aria-hidden="true">&times;</span>' +
										'  </button>' +
										'</div>');
									setTimeout(()=>{ $('#modal_ack').modal('hide'); }, 2000);
									return;
								}

								$('#ack-alert').show().append('<div class="alert alert-danger alert-dismissible fade show" role="alert">' +
								'  <strong>Error Problem Acknowledgement</strong> ('+res.status+') - '+JSON.stringify(res)+'' +
								'  <button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
								'    <span aria-hidden="true">&times;</span>' +
								'  </button>' +
								'</div>');
							}
						});
					});
				});
			});
		});
	}

