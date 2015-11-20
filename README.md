# Icinga Multi Status for Google Chrome&trade;

Icinga Multi Status helps you monitoring your (multiple or single) Icinga instances with comfortable alert badges and notifications about problems right within Google Chrome&trade;.

Get it from the [Chrome Web Store](https://chrome.google.com/webstore/detail/icinga-multi-status/khabbhcojgkibdeipanmiphceeoiijal)

## Features

- Monitoring of multiple Icinga Instances (Version 1 and 2) using it's JSON data interface and/or API
- Ability to hide/ignore certain host or service patterns and hosts/services with downtimes
- Configurable refresh time
- Ability to temporarily disable instances without deleting them
- Status-Icon in Toolbar, showing indicator for problems or number of hosts if everything is okay
- Overview Tab showing status of your Icinga instances as well as it's current host or service problems
- Hosts Tab showing you all hosts of all Instances with a quick filter to search for a host
- Services Tab showing you all services of all hosts of all Instances with a quick filter to search for a service
- Instant Chrome Notifications about new problems, if enabled
- Interface completely build on Bootstrap v3.3.5

## Requirements

Either access to
- Icinga Classic UI (Version >= 1.8.0), reachable via HTTP or HTTPS
or access to
- Icinga 2 API (Version >= 2.4), reachable via HTTPS

## How-to for using the Icinga2 API
1. Please make sure you enabled and configured the new API in your Icinga2 installation by either setting it up manually or use the CLI command for the automatic setup, which also creates a root-user for the API with a random password.
```
# Run the automatic setup
$ icinga2 api setup

# Restart the icinga2 service
$ service icinga2 restart
```
2. You will find the automatically generated API users here: `/etc/icinga2/conf.d/api-users.conf`
3. If you run into any problems, please stick to the official [Icinga 2 API documentation](http://docs.icinga.org/icinga2/latest/doc/module/icinga2/chapter/icinga2-api)


## Credits

- Daniel Schmitz, http://bashgeek.net, [@bashgeek](https://twitter.com/bashgeek)
- Heavily inspired by [IcingaChromedStatus](https://github.com/kepi/IcingaChromedStatus)

## License

This extension is released under [MIT License](https://github.com/bashgeek/icinga-multi-status/blob/master/LICENSE.md).