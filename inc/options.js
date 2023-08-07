function instance_modal(instance)
{
    $('#instance-alert').text('').hide();
    $('#instance-submit').prop('disabled', false);

    let modal = $('#modal_instance');
    modal.find('.form-group').removeClass('has-error');

    if (instance === -1) {
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
        $('#instance-hide-ack').prop('checked', false);
        $('#instance-hide-down').prop('checked', false);
        $('#instance-hide-soft').prop('checked', false);
        $('#instance-notf-nowarn').prop('checked', false);

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

            let e = instances[instance];
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
            $('#instance-ack-expire').val(e.ack_expire || -1);
            $('#instance-ack-persistent').val(e.ack_persistent || -1);
            $('#instance-ack-sticky').val(e.ack_sticky || -1);
            $('#instance-ack-author').val(e.ack_author || '');
        });
    }

    let _modal = new bootstrap.Modal('#modal_instance');
    _modal.show();
}

function instance_modal_delete(instance)
{
    let modal = $('#modal_instance_delete');
    icinga_get_instances(function (instances) {
        instances = instances.instances;

        if (instances == null) {
            instances = [];
        }

        let e = instances[instance];
        $('#instance-delete-submit').prop('disabled', false);
        $('#instance-delete-id').val(instance);
        $('#instance-delete-title').html(e.title);

        let _modal = new bootstrap.Modal('#modal_instance_delete');
        _modal.show();
    });
}

function instance_delete()
{
    $('#instance-delete-submit').prop('disabled', true);

    let modal = $('#modal_instance_delete');
    icinga_get_instances(function (instances) {
        instances = instances.instances;

        if (instances == null) {
            instances = [];
        }

        delete instances[$('#instance-delete-id').val()];
        icinga_set_instances(instances);

        $('#instance-delete-alert').removeClass().addClass('alert alert-success').html('Removed instance!').show();
        instance_table_reload();
        setTimeout(function () {
            bootstrap.Modal.getInstance('#modal_instance_delete').hide();
        }, 2000);
    });
}

function instance_active(instance)
{
    icinga_get_instances(function (instances) {
        instances = instances.instances;

        if (instances == null) {
            instances = [];
        }

        instances[instance].active = $('#instance-table-active-' + instance).prop('checked');
        icinga_set_instances(instances);
        instance_table_reload();
    });
}

function instance_save()
{
    let errors = [];

    let _submit = $('#instance-submit');
    let _url = $('#instance-url');
    let _wurl = $('#instance-url-web');
    let _title = $('#instance-title');
    let _user = $('#instance-user');
    let _pass = $('#instance-pass');
    let _hide_hosts = $('#instance-hide-hosts');
    let _hide_services = $('#instance-hide-services');

    _submit.prop('disabled', true);

    if (_url.val()) {
        let url = new URL(_url.val());
        if (!url.hostname || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
            _url.parent().addClass('has-error');
            errors.push('Given URL does not seem a valid HTTP/HTTPS URL.');
        } else {
            // OK
            _url.parent().removeClass('has-error');

            if (!_title.val()) {
                _title.val(url.hostname);
            }
        }
    } else {
        _url.parent().addClass('has-error');
        errors.push('No URL given');
    }

    if (_wurl.val()) {
        let url = new URL(_wurl.val());
        if (!url.hostname || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
            _wurl.parent().addClass('has-error');
            errors.push('Given URL does not seem a valid HTTP/HTTPS URL.');
        } else {
            // OK
            _wurl.parent().removeClass('has-error');
        }
    }

    if (_title.val()) {
        // OK
        _title.parent().removeClass('has-error');
    } else {
        _title.parent().addClass('has-error');
        errors.push('No instance title given');
    }


    if ((_user.val() && _pass.val())) {
        // OK
        _user.parent().removeClass('has-error');
        _pass.parent().removeClass('has-error');
    } else {
        if (_user.val() && !_pass.val()) {
            // Pass missing
            _pass.parent().addClass('has-error');
            _user.parent().removeClass('has-error');
            errors.push('Username given, but password missing');
        } else {
            if (!_user.val() && _pass.val()) {
                // User missing
                _user.parent().addClass('has-error');
                _pass.parent().removeClass('has-error');
                errors.push('Password given, but username missing');
            }
        }
    }

    if (_hide_hosts.val()) {
        try {
            test = new RegExp(_hide_hosts.val(), "i");
        } catch (e) {
            _hide_hosts.parent().addClass('has-error');
            errors.push('Invalid regexp for hosts given');
        }

        if (typeof test != 'undefined') {
            _hide_hosts.parent().removeClass('has-error');
        }

        delete test;
    }

    if (_hide_services.val()) {
        try {
            test = new RegExp(_hide_services.val(), "i");
        } catch (e) {
            _hide_services.parent().addClass('has-error');
            errors.push('Invalid regexp for services given');
        }

        if (typeof test != 'undefined') {
            _hide_services.parent().removeClass('has-error');
        }

        delete test;
    }

    if (errors.length) {
        _submit.prop('disabled', false);

        $('#instance-alert').removeClass().addClass('alert alert-danger').html('<b>Errors:</b><br>' + errors.join('<br>')).show();
    } else {
        $('#instance-alert').removeClass().addClass('alert alert-info').html('Checking...').show();

        icinga_fetch($('#instance-icinga-type').val(), _url.val(), _user.val(), _pass.val(), 'instance-check');
    }
}

function instance_save_return(e)
{
    if (e.error) {
        $('#instance-submit').prop('disabled', false);
        $('#instance-alert').removeClass().addClass('alert alert-danger').html('<b>Icinga Error:</b><br>' + e.text).show();
    } else {
        icinga_get_instances(function (instances) {
            instances = instances.instances;

            if (instances == null) {
                instances = [];
            }

            let instance_id = $('#instance-id').val();
            if (instance_id !== -1) {
                // Save
                instances[instance_id] = {
                    'active': instances[instance_id].active,
                    'status_last': instances[instance_id].status_last,
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

            $('#instance-alert').removeClass().addClass('alert alert-success').html('<b>Awesome!</b><br>' + e.text).show();

            instance_table_reload();

            setTimeout(function () {
                bootstrap.Modal.getInstance('#modal_instance').hide();
            }, 2000);
        });
    }
}

function instance_table_reload()
{
    icinga_get_instances(function (instances) {
        instances = instances.instances;

        if (instances == null) {
            instances = [];
        }

        let tab = $('#instances-table');
        tab.find('tbody').empty();

        if (instances.length === 0) {
            tab.find('tbody').html('<tr><td colspan="100">No instances configured yet - time to add one!</td></tr>');
        } else {
            for (i = 0; i < instances.length; i++) {
                var e = instances[i];
                tab.find('tbody').append(
                    '<tr class="' + ((!e.active) ? 'warning' : ((e.error) ? 'danger' : '')) + '">'
                    + '<td>' + e.title + '</td>'
                    + '<td>' + e.status_last + '</td>'
                    + '<td><input type="checkbox" id="instance-table-active-' + i + '" ' + ((e.active) ? 'checked' : '') + '></td>'
                    + '<td><div class="btn-group" role="group" aria-label=""><button type="button" class="btn btn-primary btn-sm" id="instance-table-edit-' + i + '">Edit</button> <button type="button" class="btn btn-danger btn-sm" id="instance-table-delete-' + i + '">Delete</button></div></td>'
                    + '</tr>'
                );

                $('#instance-table-active-' + i).click({i: i}, function (e) {
                    instance_active(e.data.i);
                });
                $('#instance-table-edit-' + i).click({i: i}, function (e) {
                    instance_modal(e.data.i);
                });
                $('#instance-table-delete-' + i).click({i: i}, function (e) {
                    instance_modal_delete(e.data.i);
                });
            }
        }
    });
}

function instance_untab_url()
{
    let _url = $('#instance-url');
    let _title = $('#instance-title');
    if (_url.val()) {
        let url = new URL(_url.val());
        if (!url.hostname || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
            _url.parent().addClass('has-error');
        } else {
            _url.parent().removeClass('has-error');

            if (!_title.val()) {
                _title.val(url.hostname);
            }
        }
    }
}

function settings_reload()
{
    icinga_get_settings(function (settings) {
        settings = settings.settings;

        let real_settings = default_settings;
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
        $('#settings-alarm-file').val(settings.alarm_file);
        $('#settings-alarm-repeat').val(settings.alarm_repeat);
    });
}

function settings_save()
{
    chrome.storage.local.set({
        'settings': {
            'refresh': $('#settings-refresh').val(),
            'ack_expire': $('#settings-ack-expire').val(),
            'ack_persistent': $('#settings-ack-persistent').val(),
            'ack_sticky': $('#settings-ack-sticky').val(),
            'ack_author': $('#settings-ack-author').val(),
            'alarm_file': $('#settings-alarm-file').val(),
            'alarm_repeat': $('#settings-alarm-repeat').val(),
        }
    });

    setTimeout(() => {
        settings_reload();
    }, 100);
}

$(document).ready(function () {
    $('#settings-submit').click(function () {
        settings_save();
    });
    $('#instance-submit').click(function () {
        instance_save();
    });
    $('#instance-delete-submit').click(function () {
        instance_delete();
    });
    $('#instance-button-add').click(function () {
        instance_modal(-1);
    });
    $('#instance-url').blur(function () {
        instance_untab_url();
    });
    instance_table_reload();
    settings_reload();
});


