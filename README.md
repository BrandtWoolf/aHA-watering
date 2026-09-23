# aHA Watering — Cistern Irrigation Card

[![hacs](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz)

A custom Home Assistant Lovelace card for a cistern-backed irrigation system. It shows an animated cistern tank, lets you switch between **street** and **cistern** water with a pump safety interlock, controls your irrigation zones, and can overlay live zone watering on a satellite image of your property.

Designed around the [Rachio Local](https://github.com/biofects/rachio_local) integration (zones exposed as `switch.*`), a Z-Wave pump + valve, and a 4–20 mA cistern level sensor read via a Shelly Uni — but it works with any on/off entities and any 0–100 % level sensor.

## Features

- 🪣 **Animated cistern tank** — gallons + %, color-coded (red/amber/blue) with a live water fill.
- 🌊 **Motion-aware surface** — the water only sloshes while the cistern is actively filling
  (raining + level rising) or emptying (pump running or level dropping); it sits still otherwise.
- 🌦️ **Weather strip** — WeatherFlow Tempest condition, temperature, rain rate, wind, and humidity
  as chips; rain highlights and drives the fill animation.
- 🔀 **Source switcher** — Street ⇆ Cistern segmented control that toggles the valve.
- ⚠️ **Pump interlock warning** — alerts if the pump runs while the valve is closed (dead-head protection).
- 🌱 **Zone grid** — per-zone run/idle with a green glow on active zones.
- 🛰️ **Satellite overlay** — draw zone polygons on a photo of your yard that pulse green while watering.
- 🗓️ **Schedule toggle** and a **Stop All** button.

## Installation (HACS)

1. HACS → ⋮ → **Custom repositories**.
2. Add `https://github.com/BrandtWoolf/aHA-watering`, category **Dashboard**.
3. Install **aHA Watering — Cistern Irrigation Card**.
4. HACS adds the resource automatically. If not, add a dashboard resource:
   - URL: `/hacsfiles/aHA-watering/cistern-irrigation-card.js`
   - Type: **JavaScript Module**
5. Hard-refresh the browser.

### Manual installation

1. Copy `dist/cistern-irrigation-card.js` to `<config>/www/`.
2. Add a resource: URL `/local/cistern-irrigation-card.js`, type **JavaScript Module**.
3. Hard-refresh.

## Level sensor setup

The 4–20 mA transmitter is read by the Shelly Uni analog input via a shunt resistor.
With a **500 Ω** shunt: 4 mA → 2.0 V (empty), 20 mA → 10.0 V (full).
See [`examples/cistern_sensors.yaml`](examples/cistern_sensors.yaml) for template sensors that
convert voltage → mA → % → gallons. Add it via a package or your `configuration.yaml`.

## Card configuration

| Option            | Type   | Required | Description                                             |
| ----------------- | ------ | -------- | ------------------------------------------------------- |
| `title`           | string | no       | Card header title.                                      |
| `cistern.level`   | entity | **yes**  | 0–100 % level sensor.                                   |
| `cistern.volume`  | entity | no       | Gallons sensor. If omitted, derived from `capacity`.    |
| `cistern.capacity`| number | no       | Tank capacity in gallons (default 500).                 |
| `source.valve`    | entity | **yes**  | Valve switch. `on` = cistern, `off` = street.           |
| `source.pump`     | entity | no       | Pump switch.                                            |
| `source.active_source` | entity | no  | Optional text sensor; else derived from the valve.      |
| `cistern.motion_hold_seconds` | number | no | How long the fill/empty animation lingers after the last level change (default 90). |
| `weather.entity`  | entity | no       | Optional `weather.*` entity (WeatherFlow **Cloud**) for condition + rain.  |
| `weather.temperature` | entity | no   | Temperature sensor.                                     |
| `weather.humidity` | entity | no      | Humidity sensor.                                        |
| `weather.wind`    | entity | no       | Wind speed sensor.                                      |
| `weather.rain_rate` | entity | no     | Rain rate / precipitation intensity sensor. `> 0` = raining. |
| `weather.precip_type` | entity | no   | Precipitation type (`none`/`rain`/`hail`). Drives the rain state. |
| `zones[]`         | list   | no       | Zone entities with `name`, optional `x`/`y`, `points`.  |
| `schedule`        | entity | no       | Schedule switch.                                        |
| `columns`         | number | no       | Zone grid columns (default 2).                          |
| `property.image`  | url    | no       | Satellite image, e.g. `/local/property.jpg`.            |
| `property.aspect_ratio` | string | no | Map aspect ratio, e.g. `"16 / 9"`.                    |
| `property.debug`  | bool   | no       | Show a live x/y readout to place zone polygons.         |
| `hide_zone_grid`  | bool   | no       | Hide the zone grid (show only the map).                 |

### Example

See [`examples/dashboard_single_card.yaml`](examples/dashboard_single_card.yaml).

```yaml
type: custom:cistern-irrigation-card
title: Irrigation
cistern:
  level: sensor.cistern_level
  volume: sensor.cistern_volume
  capacity: 500
source:
  valve: switch.cistern_valve
  pump: switch.cistern_pump
weather:
  temperature: sensor.tempest_temperature
  humidity: sensor.tempest_humidity
  wind: sensor.tempest_wind_speed
  rain_rate: sensor.tempest_precipitation_intensity
  precip_type: sensor.tempest_precipitation_type
zones:
  - entity: switch.irrigation_zone_1
    name: Zone 1
    points: "40,30 60,32 58,55 38,52"
property:
  image: /local/property.jpg
  aspect_ratio: "16 / 9"
  debug: true
```

### Placing zones on the satellite map

1. Set `property.debug: true` and add `property.image`.
2. Hover the map — the readout shows live `x y` percentages.
3. Click each corner of a zone; the coordinates print to the browser console (F12).
4. Paste them into that zone's `points: "x1,y1 x2,y2 ..."`.
5. Set `property.debug: false`.

## License

[MIT](LICENSE)
