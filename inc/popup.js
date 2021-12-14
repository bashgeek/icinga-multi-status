
	$(document).ready(function() {
		$('#popup-nav-overview').click(function(){ popup_nav('overview'); });
		$('#popup-nav-hosts').click(function(){ popup_nav('hosts'); });
		$('#popup-nav-services').click(function(){ popup_nav('services'); });
		$('#popup-nav-about').click(function(){ popup_nav('about'); });

		popup_nav('overview');

		$('#popup-tab-hosts-filter').on('keyup', function() { popup_nav('hosts'); });
		$('#popup-tab-services-filter').on('keyup', function() { popup_nav('services'); });

		$('.open-options').click(function() {
			if (chrome.runtime.openOptionsPage) {
				// New way to open options pages, if supported (Chrome 42+).
				chrome.runtime.openOptionsPage();
			} else {
				// Reasonable fallback.
				window.open(chrome.runtime.getURL('options.html'));
			}
		});
	});

	table_classes = {
		'UP': 'table-success',
		'DOWN': 'table-danger',
		'UNREACHABLE': 'table-info',
		'OK': 'table-success',
		'WARNING': 'table-warning',
		'UNKNOWN': 'table-info',
		'CRITICAL': 'table-danger'
	};

	function popup_nav(to) {
		$('#popup-nav li a').each(function(){ $(this).removeClass('active'); });
		$('#popup-nav-'+to).addClass('active');

		$('.popup-tab').each(function(){ $(this).hide(); });
		$('#popup-tab-'+to).show();

		switch(to) {
			case 'services':
				var return_func = function(e) {
					$('#popup-tab-services-tables').empty();

					if (e.state == 'ok') {
						icinga_get_instances(function (instances) {
							instances = instances.instances;

							if (instances == null) {
								instances = [];
							}

							// Go through active instances
							for(i=0; i<instances.length; i++) {
								var instance = instances[i];
								instance_line = '';

								if (instance.active) {
									// Go through all hosts and check instance
									$.each(Object.keys(e.hosts).sort(), function(h_i,h) {
										var host = e.hosts[h];
										if (host.instance == i) {
											// Host HTML Line
											switch (instance.icinga_type) {
												default: var host_name = '<a href="'+instance.url.replace(/\/$/, '')+'/cgi-bin/extinfo.cgi?type=1&host='+host.name+'" target="_blank">'+host.name+'</a>'; break;
												case 'icinga2_api': if (instance.url_web) { var host_name = '<a href="'+instance.url_web.replace(/\/$/, '')+'/monitoring/host/show?host='+host.name+'" target="_blank">'+host.name+'</a>'; } else { var host_name = host.name; } break;
											}
											host_line = '<tr><td>'+host_name+'</td><td></td><td class="'+table_classes[host.status]+'">'+host.status+'</td></tr>';
											service_line = '';

											// Go through all services
											$.each(Object.keys(host.services).sort(), function(s_i,s) {
												var service = host.services[s];

												var add_service = false;
												if ($('#popup-tab-services-filter').val()) {
													var reg = new RegExp($('#popup-tab-services-filter').val(), "i");
													if (reg.test(service.name))
														add_service = true;
												} else {
													add_service = true;
												}

												// Service HTML Line
												if (add_service) {
													switch (instance.icinga_type) {
														default: var service_name = '<a href="'+instance.url.replace(/\/$/, '')+'/cgi-bin/extinfo.cgi?type=2&host='+host.name+'&service='+service.name+'" target="_blank">'+service.name+'</a>'; break;
														case 'icinga2_api': if (instance.url_web) { var service_name = '<a href="'+instance.url_web.replace(/\/$/, '')+'/monitoring/service/show?host='+host.name+'&service='+service.sname+'" target="_blank">'+service.name+'</a>'; } else { var service_name = service.name; } break;
													}
													service_line += '<tr><td></td><td>'+service_name+'</td><td class="'+table_classes[service.status]+'">'+service.status+'</td></tr>';
												}
											});

											// If there is a service line OR host status down, add host line and append service lines
											if (service_line != '') {
												instance_line += host_line+service_line;
											}

											delete host_line;
											delete service_line;
										}
									});

									// Insert table
									if (instance_line) {
										$('#popup-tab-services-tables').append(''
											+ '<h5 class="instance-title">'+instance.title+'</h5>'
											+ '<table class="table table-sm table-striped table-hover icinga-hosts-services">'
												+ '<thead>'
													+ '<tr>'
														+ '<th>Host</th>'
														+ '<th>Service</th>'
														+ '<th>Status</th>'
														//+ '<th></th>'
													+ '</tr>'
												+ '</thead>'
												+ '<tbody>'
													+ instance_line
												+ '</tbody>'
											+ '</table>'
										);
									}

									delete instance_line;
								}
							}
						});
					} else {
						$('#popup-tab-services-tables').html('An error occured - could not connect with background task.');
					}
				}

				if (typeof chrome !== 'undefined') {
					chrome.runtime.sendMessage({ request: 'data' }, function(e){ return_func(e); });
				} else {
					var sending = browser.runtime.sendMessage({ request: 'data' });
					sending.then(function(e) { return_func(e); }, function(e) { $('#popup-tab-services-tables').html('An error occured - could not connect with background task.'); });
				}
			break;

			case 'hosts':
				var return_func = function(e) {
					$('#popup-tab-hosts-tables').empty();

					if (e.state == 'ok') {
						icinga_get_instances(function (instances) {
							instances = instances.instances;

							if (instances == null) {
								instances = [];
							}

							// Go through active instances
							for(i=0; i<instances.length; i++) {
								var instance = instances[i];
								instance_line = '';

								if (instance.active) {
									// Go through all hosts and check instance
									$.each(Object.keys(e.hosts).sort(), function(h_i,h) {
										var host = e.hosts[h];
										if (host.instance == i) {
											// regexp check filter
											var add_host = false;
											if ($('#popup-tab-hosts-filter').val()) {
												var reg = new RegExp($('#popup-tab-hosts-filter').val(), "i");
												if (reg.test(host.name))
													add_host = true;
											} else {
												add_host = true;
											}

											if (add_host) {
												// Host HTML Line
												switch (instance.icinga_type) {
													default: var host_name = '<a href="'+instance.url.replace(/\/$/, '')+'/cgi-bin/extinfo.cgi?type=1&host='+host.name+'" target="_blank">'+host.name+'</a>'; break;
													case 'icinga2_api': if (instance.url_web) { var host_name = '<a href="'+instance.url_web.replace(/\/$/, '')+'/monitoring/host/show?host='+host.name+'" target="_blank">'+host.name+'</a>'; } else { var host_name = host.name; } break;
												}
												host_line = '<tr><td>'+host_name+'</td><td class="'+table_classes[host.status]+'">'+host.status+'</td></tr>';
												instance_line += host_line;
											}

											delete host_line;
										}
									});

									// Insert table
									if (instance_line) {
										$('#popup-tab-hosts-tables').append(''
											+ '<h5 class="instance-title">'+instance.title+'</h5>'
											+ '<table class="table table-sm table-striped table-hover icinga-hosts">'
												+ '<thead>'
													+ '<tr>'
														+ '<th>Host</th>'
														+ '<th>Status</th>'
													+ '</tr>'
												+ '</thead>'
												+ '<tbody>'
													+ instance_line
												+ '</tbody>'
											+ '</table>'
										);
									}

									delete instance_line;
								}
							}
						});
					} else {
						$('#popup-tab-hosts-tables').html('An error occured - could not connect with background task.');
					}
				};

				if (typeof chrome !== 'undefined') {
					chrome.runtime.sendMessage({ request: 'data' }, function(e){ return_func(e); });
				} else {
					var sending = browser.runtime.sendMessage({ request: 'data' });
					sending.then(function(e) { return_func(e); }, function(e) { $('#popup-tab-hosts-tables').html('An error occured - could not connect with background task.'); });
				}
			break;

			case 'overview':
				var return_func = function(e) {
					$('#popup-tab-overview-table').find('tbody').empty();
					$('#popup-tab-overview-downs').empty();
					$('#popup-tab-overview .alert').each(function(){ $(this).hide(); });

					if (e.state === 'ok') {
						icinga_get_instances(function (instances) {
							instances = instances.instances;

							if (instances == null) {
								instances = [];
							}

							let worst_status = 0;

							// Go through active instances
							for(i=0; i<instances.length; i++) {
								let instance = instances[i];
								let instance_i = i;
								let counter_total = { hosts: 0, services: 0 };
								let counter_hosts = { up: 0, down: 0, unr: 0 };
								let counter_services = { ok: 0, warn: 0, unkn: 0, crit: 0 };

								if (instance.active && !instance.error) {
									let instance_lines = [];

									// Go through all hosts and check instance
									$.each(Object.keys(e.hosts), function(h_i,h) {
										let host = e.hosts[h];
										if (host.instance === i) {
											counter_total.hosts += 1;

											// Possible DOWN UNREACHABLE UP
											switch(host.status) {
												case 'UP': counter_hosts.up += 1; break;
												case 'DOWN': counter_hosts.down += 1; break;
												case 'UNREACHABLE': counter_hosts.unr += 1; break;
											}

											// Host HTML Line
											let host_line=$('<tr>');
											let service_lines=[];
											let host_options=null;
											switch (instance.icinga_type) {
												default:
													host_line.append($('<td class="align-middle">').html('<a href="'+instance.url.replace(/\/$/, '')+'/cgi-bin/extinfo.cgi?type=1&host='+host.name+'" target="_blank">'+host.name+'</a>'));
													break;
												case 'icinga2_api':
													host_line.append($('<td class="align-middle">').html(
														instance.url_web
														? '<a href="'+instance.url_web.replace(/\/$/, '')+'/monitoring/host/show?host='+host.name+'" target="_blank">'+host.name+'</a>'
														: host.name
													));
													host_options = $('<td class="align-middle">').append($('<div class="btn-group" role="group" aria-label="Actions">')
														.append(
															$('<button class="btn btn-outline-dark py-0 px-1">').html('<svg style="width:24px;" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>')
	                                                        .attr('title', 'Acknowledge issue')
	                                                        .on('click', function(){ icinga_acknowledge('host', instance_i, host.name); })
														)
														.append(
															$('<button class="btn btn-outline-dark py-0 px-1">').html('<svg style="width:24px;" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>')
		                                                    .attr('title', 'Reschedule check')
                                                            .on('click', function(){ icinga_recheck('host', instance_i, host.name); })
														)
													);
													break;
											}
											host_line.append($('<td>'));
											host_line.append($('<td class="align-middle">').addClass(table_classes[host.status]).html(host.status+((host.state_type === 'SOFT') ? ' (S)' : '')));
											if (host_options !== null) {
												host_line.append(host_options);
											}

											// Go through all services
											$.each(Object.keys(host.services), function(s_i,s) {
												let service = host.services[s];
												counter_total.services += 1;

												// Possible OK WARNING UNKNOWN CRITICAL
												switch(service.status) {
													case 'OK': counter_services.ok += 1; break;
													case 'WARNING': counter_services.warn += 1; break;
													case 'UNKNOWN': counter_services.unkn += 1; break;
													case 'CRITICAL': counter_services.crit += 1; break;
												}

												// Service HTML Line
												if (service.status === 'WARNING' || service.status === 'CRITICAL') {
													let service_line = $('<tr>');
													service_line.append($('<td>'));
													let service_options=null;
													switch (instance.icinga_type) {
														default:
															service_line.append($('<td class="align-middle">').html('<a href="'+instance.url.replace(/\/$/, '')+'/cgi-bin/extinfo.cgi?type=2&host='+host.name+'&service='+service.name+'" target="_blank">'+service.name+'</a>'));
															break;
														case 'icinga2_api':
															service_line.append($('<td class="align-middle">').html(
																instance.url_web
																? '<a href="'+instance.url_web.replace(/\/$/, '')+'/monitoring/service/show?host='+host.name+'&service='+service.sname+'" target="_blank">'+service.name+'</a>'
																: service.name
															));
															service_options = $('<td class="align-middle">').append($('<div class="btn-group" role="group" aria-label="Actions">')
																.append(
																	$('<button class="btn btn-outline-dark py-0 px-1">').html('<svg style="width:24px;" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>')
				                                                    .attr('title', 'Acknowledge issue')
				                                                    .on('click', function(){ icinga_acknowledge('service', instance_i, host.name, service.sname); })
																)
																.append(
																	$('<button class="btn btn-outline-dark py-0 px-1">').html('<svg style="width:24px;" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>')
				                                                    .attr('title', 'Reschedule check')
				                                                    .on('click', function(){ icinga_recheck('service', instance_i, host.name, service.sname); })
																)
															);
															break;
													}
													service_line.append($('<td class="align-middle">').addClass(table_classes[service.status]).html(service.status+((service.state_type === 'SOFT') ? ' (S)' : '')));
													if (service_options !== null) {
														service_line.append(service_options);
													}

													service_lines.push(service_line);
												}
											});

											// If there is a service line OR host status down, add host line and append service lines
											if (host.status === 'DOWN' || host.status === 'UNREACHABLE' || service_lines.length > 0) {
												instance_lines.push(host_line);

												service_lines.forEach(function(v){
													instance_lines.push(v);
												});
											}
										}
									});

									// Build hosts column
									let host_column = '';
									if (counter_hosts.up) host_column += '<span class="badge bg-success" title="UP">'+counter_hosts.up+'</span> ';
									if (counter_hosts.down) host_column += '<span class="badge bg-danger" title="DOWN">'+counter_hosts.down+'</span> ';
									if (counter_hosts.unr) host_column += '<span class="badge bg-primary" title="UNREACHABLE">'+counter_hosts.unr+'</span> ';

									// Build services column
									let service_column = '';
									if (counter_services.ok) service_column += '<span class="badge bg-success" title="OK">'+counter_services.ok+'</span> ';
									if (counter_services.warn) service_column += '<span class="badge bg-warning" title="WARNING">'+counter_services.warn+'</span> ';
									if (counter_services.crit) service_column += '<span class="badge bg-danger" title="CRITICAL">'+counter_services.crit+'</span> ';
									if (counter_services.unkn) service_column += '<span class="badge bg-default" title="UNKNOWN">'+counter_services.unkn+'</span> ';

									// Insert into table
									$('#popup-tab-overview-table').find('tbody').append('<tr>'
									+ '<td><a href="'+((instance.icinga_type==='icinga2_api')?instance.url_web:instance.url)+'" target="_blank">'+instance.title+'</a></td>'
									+ '<td>'+host_column+'</td>'
									+ '<td>'+service_column+'</td>'
									+ '</tr>');

									// Update worst status
									if (counter_services.crit || counter_hosts.down || counter_hosts.unr) {
										worst_status = 2;
									} else if (counter_services.warn && worst_status === 0) {
										worst_status = 1;
									}

									// Error table
									if (instance_lines.length > 0) {
										$('#popup-tab-overview-downs').append('<h5 class="instance-title">'+instance.title+'</h5>');

										let table = $('<table class="table table-sm table-striped table-hover icinga-hosts-services">');
										let thead = $('<thead>').append('<th>Host</th><th>Service</th><th>Status</th>');
										if (instance.icinga_type === 'icinga2_api') {
											thead.append('<th></th>');
										}
										table.append(thead);
										let tbody = $('<tbody>');
										instance_lines.forEach(function(v){
											tbody.append(v);
										});
										table.append(tbody);
										$('#popup-tab-overview-downs').append(table);
									}

								} else if (instance.active && instance.error) {
									// Insert into table
									$('#popup-tab-overview-table').find('tbody').append('<tr>'
									+ '<td><a href="'+((instance.icinga_type==='icinga2_api')?instance.url_web:instance.url)+'" target="_blank">'+instance.title+'</a></td>'
									+ '<td colspan="2">'+instance.status_last+'</td>'
									+ '</tr>');
								}
							}

							// Update alert according to worst status
							if (instances.length === 0) {
								$('#popup-tab-overview-alert-new').show();
							} else {
								$('#popup-tab-overview-alert-'+worst_status).show();
							}
						});
					} else {
						$('#popup-tab-overview').html('An error occured - could not connect with background task.');
					}
				};

				if (typeof chrome !== 'undefined') {
					chrome.runtime.sendMessage({ request: 'data' }, function(e){ return_func(e); });
				} else {
					var sending = browser.runtime.sendMessage({ request: 'data' });
					sending.then(function(e) { return_func(e); }, function(e) { $('#popup-tab-overview').html('An error occured - could not connect with background task.'); });
				}
			break;
		}
	}
