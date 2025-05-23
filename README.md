# Icinga Multi Status for web browsers

![unnamed](https://github.com/user-attachments/assets/9ffd3408-e18c-4432-9438-37b30b776775)

Icinga Multi Status helps you to monitor your (multiple or single) Icinga instances with comfortable alert badges and notifications about incidents right within your web browser.

Get it from the [Chrome Web Store](https://chrome.google.com/webstore/detail/icinga-multi-status/khabbhcojgkibdeipanmiphceeoiijal)

Get it from the [Mozilla Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/icinga-multi-status-real/)

## Features

- Monitoring of multiple Icinga Instances (Version 1 and 2) using it's JSON data interface and/or API
- Ability to hide/ignore certain host or service patterns and hosts/services with downtimes
- Configurable refresh time for each instance
- Configurable alarm sounds
- Ability to temporarily disable instances without deleting them
- Status-Icon in Toolbar, showing indicator for problems or number of hosts if everything is okay
- Overview Tab showing status of your Icinga instances as well as it's current host or service problems
- Set an host and/or service issue as "Acknowledged"
- Ability to trigger an immediate service recheck
- Hosts Tab showing you all hosts of all Instances with a quick filter to search for a host
- Services Tab showing you all services of all hosts of all Instances with a quick filter to search for a service
- Instant browser/OS notifications about new problems, if enabled
- Interface completely build on TailwindCSS

## Support

- Icinga Classic UI (Requires Version >= 1.8.0), via HTTP or HTTPS
- Icinga 2 API (Requires Version >= 2.4), via HTTPS

## How-to for using the [Icinga 2 API](https://www.icinga.com/docs/icinga2/latest/doc/12-icinga2-api/)
- Please make sure you enabled and configured the new API in your Icinga 2 installation by either setting it up manually or use the CLI command for the automatic setup, which also creates a root-user for the API with a random password.
```
# Run the automatic setup
$ icinga2 api setup

# Restart the icinga2 service
$ service icinga2 restart
```
- You will find the automatically generated API user here: `/etc/icinga2/conf.d/api-users.conf`
- The default port of the Icinga 2 API is `5665`, so the URL to go with would be like: `https://myicingaserver.com:5665/`
- If you use a self-signed certificate (like the one automatically created in the first step) you have to add it to your browsers/OS trusted store before it'll work in the plugin. This can easily be done be visiting the API URL in a browser tab and accept the certificate.
- Currently we require the following API permissions: ```objects/query/host```, ```status/query```, ```objects/query/service```
- If you want to use the Acknowledgement functionality, we additionally need: ```actions/acknowledge-problem```
- If you want to use the Reschedule functionality, we additionally need: ```actions/reschedule-check```
- If you run into any problems, please stick to the official [Icinga 2 API documentation](https://www.icinga.com/docs/icinga2/latest/doc/12-icinga2-api/)

## How to generate assets
- Install NodeJS 20 and [Bun](https://bun.sh/)
- `bun install`
- `bun run build`

## Credits

- Daniel Schmitz, [mastodon.social/@bashgeek](https://mastodon.social/@bashgeek)
- Heavily inspired by [IcingaChromedStatus](https://github.com/kepi/IcingaChromedStatus)

## License

This extension is released under [MIT License](https://github.com/bashgeek/icinga-multi-status/blob/master/LICENSE.md).
