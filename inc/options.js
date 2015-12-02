
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
			$('#instance-icinga-type').val('');
			$('#instance-hide-hosts').val('');
			$('#instance-hide-services').val('');
			$('#instance-hide-ack').prop('checked',false);
			$('#instance-hide-down').prop('checked',false);
			$('#instance-notf-nowarn').prop('checked',false);
		} else {
			var instances = icinga_get_instances();
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
			$('#instance-notf-nowarn').prop('checked', e.notf_nowarn);
		}

		modal.modal();
	}

	function instance_modal_delete(instance) {
		var modal = $('#modal_instance_delete');
		var instances = icinga_get_instances();
		var e = instances[instance];

		$('#instance-delete-submit').prop('disabled', false);

		$('#instance-delete-id').val(instance);
		$('#instance-delete-title').html(e.title);

		modal.modal();
	}

	function instance_delete() {
		$('#instance-delete-submit').prop('disabled', true);

		var modal = $('#modal_instance_delete');
		var instances = icinga_get_instances();
		var e = instances[$('#instance-delete-id').val()];

		delete instances[$('#instance-delete-id').val()];
		icinga_set_instances(instances);

		$('#instance-delete-alert').removeClass().addClass('alert alert-success').html('Removed instance!').show();
		instance_table_reload();
		setTimeout(function(){ $('#modal_instance_delete').modal('hide'); }, 2000);
	}

	function instance_active(instance) {
		var instances = icinga_get_instances();
		instances[instance].active = $('#instance-table-active-'+instance).prop('checked');
		icinga_set_instances(instances);
		instance_table_reload();
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
			var instances = icinga_get_instances();
			
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
					'hide_ack': ($('#instance-hide-ack').prop('checked')) ? true : false,
					'hide_down': ($('#instance-hide-down').prop('checked')) ? true : false,
					'notf_nowarn': ($('#instance-notf-nowarn').prop('checked')) ? true : false
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
					'hide_ack': ($('#instance-hide-ack').prop('checked')) ? true : false,
					'hide_down': ($('#instance-hide-down').prop('checked')) ? true : false,
					'notf_nowarn': ($('#instance-notf-nowarn').prop('checked')) ? true : false
				});
			}

			icinga_set_instances(instances);

			$('#instance-alert').removeClass().addClass('alert alert-success').html('<b>Awesome!</b><br>'+e.text).show();

			instance_table_reload();

			setTimeout(function(){ $('#modal_instance').modal('hide'); }, 2000);
		}
	}

	function instance_table_reload() {
		var instances = icinga_get_instances();
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
					+ '<td><button type="button" class="btn btn-primary btn-xs" id="instance-table-edit-'+i+'">Edit</button> <button type="button" class="btn btn-danger btn-xs" id="instance-table-delete-'+i+'">Delete</button></td>'
					+ '</tr>'
				);

				$('#instance-table-active-'+i).click({ i: i }, function(e){ instance_active(e.data.i); });
				$('#instance-table-edit-'+i).click({ i: i }, function(e){ instance_modal(e.data.i); });
				$('#instance-table-delete-'+i).click({ i: i }, function(e){ instance_modal_delete(e.data.i); });
			}

		}
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
		var settings = icinga_get_settings();

		$('#settings-refresh').val(settings.refresh);
	}

	function settings_save() {
		icinga_set_setting('refresh', $('#settings-refresh').val());

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


