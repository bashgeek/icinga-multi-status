
	function instance_modal(instance) {
		$('#instance-alert').text('');
		$('#instance-alert').hide();
		$('#instance-submit').prop('disabled', false);

		var modal = $('#modal_instance');
		modal.find('.form-group').removeClass('has-error');

		if (instance == -1) {
			modal.find('.modal-title').text('Add new instance');
			$('#instance-id').val(-1);

			$('#instance-url').val('');
			$('#instance-url-web').val('');
			$('#instance-title').val('');
			$('#instance-user').val('');
			$('#instance-pass').val('');
			$('#instance-icinga-type').val('icinga2_api');
			$('#instance-hide-hosts').val('');
			$('#instance-hide-services').val('');
			$('#instance-hide-ack').prop('checked',false);
			$('#instance-hide-down').prop('checked',false);
			$('#instance-hide-soft').prop('checked',false);
			$('#instance-notf-nowarn').prop('checked',false);

			$('#instance-ack-expire').val(-1);
			$('#instance-ack-persistent').val(-1);
			$('#instance-ack-sticky').val(-1);
			$('#instance-ack-author').val('');
		} else {
			icinga_get_instances(function (instances) {
				instances = instances.instances;

				if (instances == null) {
					instances = [];
				}

				var e = instances[instance];
				modal.find('.modal-title').text('Edit instance');
				$('#instance-id').val(instance);
				$('#instance-url').val(e.url);
				$('#instance-url-web').val(e.url_web);
				$('#instance-title').val(e.title);
				$('#instance-icinga-type').val(e.icinga_type);
				$('#instance-user').val(e.user);
				$('#instance-pass').val(e.pass);
				$('#instance-hide-hosts').val(e.hide_hosts);
				$('#instance-hide-services').val(e.hide_services);
				$('#instance-hide-ack').prop('checked', e.hide_ack);
				$('#instance-hide-down').prop('checked', e.hide_down);
				$('#instance-hide-soft').prop('checked', e.hide_soft);
				$('#instance-notf-nowarn').prop('checked', e.notf_nowarn);
				$('#instance-ack-expire').val(e.ack_expire ?? -1);
				$('#instance-ack-persistent').val(e.ack_persistent ?? -1);
				$('#instance-ack-sticky').val(e.ack_sticky ?? -1);
				$('#instance-ack-author').val(e.ack_author ?? '');
			});
		}

		modal.modal();
	}

	function instance_modal_delete(instance) {
		var modal = $('#modal_instance_delete');
		icinga_get_instances(function (instances) {
			instances = instances.instances;

			if (instances == null) {
				instances = [];
			}

			var e = instances[instance];
			$('#instance-delete-submit').prop('disabled', false);
			$('#instance-delete-id').val(instance);
			$('#instance-delete-title').html(e.title);

			modal.modal();
		});
	}

	function instance_delete() {
		$('#instance-delete-submit').prop('disabled', true);

		var modal = $('#modal_instance_delete');
		icinga_get_instances(function (instances) {
			instances = instances.instances;

			if (instances == null) {
				instances = [];
			}

			var e = instances[$('#instance-delete-id').val()];

			delete instances[$('#instance-delete-id').val()];
			icinga_set_instances(instances);

			$('#instance-delete-alert').removeClass().addClass('alert alert-success').html('Removed instance!').show();
			instance_table_reload();
			setTimeout(function(){ $('#modal_instance_delete').modal('hide'); }, 2000);
		});
	}

	function instance_active(instance) {
		icinga_get_instances(function (instances) {
			instances = instances.instances;

			if (instances == null) {
				instances = [];
			}

			instances[instance].active = $('#instance-table-active-'+instance).prop('checked');
			icinga_set_instances(instances);
			instance_table_reload();
		});
	}

	function instance_save() {
		var errors = [];

		$('#instance-submit').prop('disabled', true);

		if ($('#instance-url').val()) {
			var url = URI($('#instance-url').val());
			if (!url.hostname() || (url.scheme() != 'http' && url.scheme() != 'https')) {
				$('#instance-url').parent().addClass('has-error');
				errors.push('Given URL does not seem a valid HTTP/HTTPS URL.');
			} else {
				// OK
				$('#instance-url').parent().removeClass('has-error');

				if (!$('#instance-title').val())
					$('#instance-title').val(url.hostname());
			}
		} else {
			$('#instance-url').parent().addClass('has-error');
			errors.push('No URL given');
		}

		if ($('#instance-url-web').val()) {
			var url = URI($('#instance-url-web').val());
			if (!url.hostname() || (url.scheme() != 'http' && url.scheme() != 'https')) {
				$('#instance-url-web').parent().addClass('has-error');
				errors.push('Given URL does not seem a valid HTTP/HTTPS URL.');
			} else {
				// OK
				$('#instance-url-web').parent().removeClass('has-error');
			}
		}

		if ($('#instance-title').val()) {
			// OK
			$('#instance-title').parent().removeClass('has-error');
		} else {
			$('#instance-title').parent().addClass('has-error');
			errors.push('No instance title given');
		}

		if (($('#instance-user').val() && $('#instance-pass').val())) {
			// OK
			$('#instance-user').parent().removeClass('has-error');
			$('#instance-pass').parent().removeClass('has-error');
		} else if ($('#instance-user').val() && !$('#instance-pass').val()) {
			// Pass missing
			$('#instance-pass').parent().addClass('has-error');
			$('#instance-user').parent().removeClass('has-error');
			errors.push('Username given, but password missing');
		} else if (!$('#instance-user').val() && $('#instance-pass').val()) {
			// User missing
			$('#instance-user').parent().addClass('has-error');
			$('#instance-pass').parent().removeClass('has-error');
			errors.push('Password given, but username missing');
		}

		if ($('#instance-hide-hosts').val()) {
			try {
				test = new RegExp($('#instance-hide-hosts').val(), "i");
			} catch(e) {
				$('#instance-hide-hosts').parent().addClass('has-error');
				errors.push('Invalid regexp for hosts given');
			}

			if (typeof test != 'undefined')
				$('#instance-hide-hosts').parent().removeClass('has-error');

			delete test;
		}

		if ($('#instance-hide-services').val()) {
			try {
				test = new RegExp($('#instance-hide-services').val(), "i");
			} catch(e) {
				$('#instance-hide-services').parent().addClass('has-error');
				errors.push('Invalid regexp for services given');
			}

			if (typeof test != 'undefined')
				$('#instance-hide-services').parent().removeClass('has-error');

			delete test;
		}

		if (errors.length) {
			$('#instance-submit').prop('disabled', false);

			$('#instance-alert').removeClass().addClass('alert alert-danger').html('<b>Errors:</b><br>'+errors.join('<br>')).show();
		} else {
			$('#instance-alert').removeClass().addClass('alert alert-info').html('Checking...').show();

			icinga_fetch($('#instance-icinga-type').val(), $('#instance-url').val(), $('#instance-user').val(), $('#instance-pass').val(), 'instance-check');
		}
	}

	function instance_save_return(e) {
		if (e.error) {
			$('#instance-submit').prop('disabled', false);
			$('#instance-alert').removeClass().addClass('alert alert-danger').html('<b>Icinga Error:</b><br>'+e.text).show();
		} else {
			icinga_get_instances(function (instances) {
				instances = instances.instances;

				if (instances == null) {
					instances = [];
				}

				if ($('#instance-id').val() != -1) {
					// Save
					instances[$('#instance-id').val()] = {
						'active': instances[$('#instance-id').val()].active,
						'status_last': instances[$('#instance-id').val()].status_last,
						'url': $('#instance-url').val(),
						'url_web': $('#instance-url-web').val(),
						'icinga_type': $('#instance-icinga-type').val(),
						'user': $('#instance-user').val(),
						'pass': $('#instance-pass').val(),
						'title': $('#instance-title').val(),
						'hide_hosts': $('#instance-hide-hosts').val(),
						'hide_services': $('#instance-hide-services').val(),
						'hide_ack': $('#instance-hide-ack').prop('checked'),
						'hide_down': $('#instance-hide-down').prop('checked'),
						'hide_soft': $('#instance-hide-soft').prop('checked'),
						'notf_nowarn': $('#instance-notf-nowarn').prop('checked'),
						'ack_expire': $('#instance-ack-expire').val(),
						'ack_persistent': $('#instance-ack-persistent').val(),
						'ack_sticky': $('#instance-ack-sticky').val(),
						'ack_author': $('#instance-ack-author').val(),
					}
				} else {
					// Add
					instances.push({
						'active': true,
						'status_last': e.text,
						'url': $('#instance-url').val(),
						'url_web': $('#instance-url-web').val(),
						'user': $('#instance-user').val(),
						'pass': $('#instance-pass').val(),
						'icinga_type': $('#instance-icinga-type').val(),
						'title': $('#instance-title').val(),
						'hide_hosts': $('#instance-hide-hosts').val(),
						'hide_services': $('#instance-hide-services').val(),
						'hide_ack': $('#instance-hide-ack').prop('checked'),
						'hide_down': $('#instance-hide-down').prop('checked'),
						'hide_soft': $('#instance-hide-soft').prop('checked'),
						'notf_nowarn': $('#instance-notf-nowarn').prop('checked'),
						'ack_expire': $('#instance-ack-expire').val(),
						'ack_persistent': $('#instance-ack-persistent').val(),
						'ack_sticky': $('#instance-ack-sticky').val(),
						'ack_author': $('#instance-ack-author').val(),
					});
				}

				icinga_set_instances(instances);

				$('#instance-alert').removeClass().addClass('alert alert-success').html('<b>Awesome!</b><br>'+e.text).show();

				instance_table_reload();

				setTimeout(function(){ $('#modal_instance').modal('hide'); }, 2000);
			});
		}
	}

	function instance_table_reload() {
		icinga_get_instances(function (instances) {
            instances = instances.instances;

			if (instances == null) {
				instances = [];
			}

			var tab = $('#instances-table');
			tab.find('tbody').empty();

			if (instances.length == 0) {
				tab.find('tbody').html('<tr><td colspan="100">No instances configured yet - time to add one!</td></tr>');
			} else {
				for (i=0; i<instances.length; i++) {
					var e = instances[i];
					tab.find('tbody').append(
						'<tr class="'+((!e.active) ? 'warning' : ((e.error) ? 'danger' : ''))+'">'
						+ '<td>'+e.title+'</td>'
						+ '<td>'+e.status_last+'</td>'
						+ '<td><input type="checkbox" id="instance-table-active-'+i+'" '+((e.active) ? 'checked' : '')+'></td>'
						+ '<td><div class="btn-group" role="group" aria-label=""><button type="button" class="btn btn-primary btn-sm" id="instance-table-edit-'+i+'">Edit</button> <button type="button" class="btn btn-danger btn-sm" id="instance-table-delete-'+i+'">Delete</button></div></td>'
						+ '</tr>'
					);

					$('#instance-table-active-'+i).click({ i: i }, function(e){ instance_active(e.data.i); });
					$('#instance-table-edit-'+i).click({ i: i }, function(e){ instance_modal(e.data.i); });
					$('#instance-table-delete-'+i).click({ i: i }, function(e){ instance_modal_delete(e.data.i); });
				}
			}
		});
	}

	function instance_untab_url() {
		if ($('#instance-url').val()) {
			var url = URI($('#instance-url').val());
			if (!url.hostname() || (url.scheme() != 'http' && url.scheme() != 'https')) {
				$('#instance-url').parent().addClass('has-error');
			} else {
				$('#instance-url').parent().removeClass('has-error');

				if (!$('#instance-title').val())
					$('#instance-title').val(url.hostname());
			}
		}
	}

	function settings_reload() {
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

			$('#settings-refresh').val(settings.refresh);
			$('#settings-ack-expire').val(settings.ack_expire);
			$('#settings-ack-persistent').val(settings.ack_persistent);
			$('#settings-ack-sticky').val(settings.ack_sticky);
			$('#settings-ack-author').val(settings.ack_author);
		});
	}

	function settings_save() {
		icinga_set_setting('refresh', $('#settings-refresh').val());
		icinga_set_setting('ack_expire', $('#settings-ack-expire').val());
		icinga_set_setting('ack_persistent', $('#settings-ack-persistent').val());
		icinga_set_setting('ack_sticky', $('#settings-ack-sticky').val());
		icinga_set_setting('ack_author', $('#settings-ack-author').val());

		settings_reload();
	}

	$(document).ready(function() {
		$('#settings-submit').click(function(){ settings_save(); });
		$('#instance-submit').click(function(){ instance_save(); });
		$('#instance-delete-submit').click(function(){ instance_delete(); });
		$('#instance-button-add').click(function(){ instance_modal(-1); });
		$('#instance-url').blur(function(){ instance_untab_url(); });
		instance_table_reload();
		settings_reload();
	});


