# Changelog

All notable changes to the Cistern Irrigation Card are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-09-23
### Added
- Weather strip powered by a WeatherFlow Tempest station (`weather` config):
  condition, temperature, rain rate, wind, and humidity chips. Supports the
  local integration's sensors or an optional `weather.*` entity (Cloud).
### Changed
- The tank surface now only animates while the cistern is actively **filling**
  (raining and level rising) or **emptying** (pump running or level dropping),
  and sits still otherwise. Added `cistern.motion_hold_seconds` (default 90).

## [1.0.0] - 2026-09-23
### Added
- Initial public release of the Cistern Irrigation Card, a single-file custom
  Lovelace card (no build step, no dependencies).
- Animated cistern tank with level %, gallons, and voltage readout.
- Street/cistern source toggle with pump + valve interlock and safety warnings.
- Rachio zone grid with run/stop controls, status, and last-watered display.
- Schedule control and stop-all action.
- Optional satellite property overlay that highlights actively watering zones.
- Example template sensors and single-card / two-tab dashboard YAML.
