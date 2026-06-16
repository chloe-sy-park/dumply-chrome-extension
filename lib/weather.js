/* 날씨 — Open-Meteo (API 키 불필요) + 기기 위치(GPS) */

'use strict';

const AlfredoWeather = (() => {
  const WMO = {
    0: { emoji: '☀️', label: '맑음' },
    1: { emoji: '🌤️', label: '대체로 맑음' },
    2: { emoji: '⛅', label: '구름 조금' },
    3: { emoji: '☁️', label: '흐림' },
    45: { emoji: '🌫️', label: '안개' },
    51: { emoji: '🌦️', label: '이슬비' },
    61: { emoji: '🌧️', label: '비' },
    71: { emoji: '🌨️', label: '눈' },
    80: { emoji: '🌧️', label: '소나기' },
    95: { emoji: '⛈️', label: '뇌우' },
  };

  function getDeviceLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('NO_GEO'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          source: 'gps',
        }),
        reject,
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  async function reverseGeocode(lat, lon) {
    // Open-Meteo는 reverse geocoding 미지원 — Nominatim(OSM) 사용
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}` +
      '&format=json&accept-language=ko';
    const resp = await fetch(url, { headers: { 'User-Agent': 'Dumply-Extension/1.0' } });
    if (!resp.ok) throw new Error('REVERSE_FAIL');
    const data = await resp.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.county || null;
  }

  async function geocodeCity(city) {
    const name = (city || '').trim();
    if (!name) throw new Error('NO_CITY');
    const url =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}` +
      '&count=1&language=ko&format=json';
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('GEOCODE_FAIL');
    const data = await resp.json();
    const hit = data.results?.[0];
    if (!hit) throw new Error('CITY_NOT_FOUND');
    return { lat: hit.latitude, lon: hit.longitude, label: hit.name, source: 'city' };
  }

  async function resolveCoords(settings, { preferGeo = true } = {}) {
    const saved =
      settings.lat != null && settings.lon != null
        ? { lat: settings.lat, lon: settings.lon, source: 'saved' }
        : null;

    if (preferGeo) {
      try {
        const gps = await Promise.race([
          getDeviceLocation(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('GEO_TIMEOUT')), 3500)),
        ]);
        return gps;
      } catch {
        if (saved) return saved;
      }
    } else if (saved) {
      return saved;
    }

    return geocodeCity(settings.weatherCity || '서울');
  }

  async function fetchWeather(lat, lon) {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&current=temperature_2m,weather_code&timezone=auto';
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('WEATHER_FAIL');
    const data = await resp.json();
    const code = data.current?.weather_code ?? 0;
    const temp = Math.round(data.current?.temperature_2m ?? 0);
    const info = WMO[code] || WMO[Math.floor(code / 10) * 10] || { emoji: '🌡️', label: '날씨' };
    return { temp, emoji: info.emoji, label: info.label, lat, lon };
  }

  /**
   * @param {object} settings
   * @param {{ preferGeo?: boolean, onCoords?: (c:{lat:number,lon:number,source:string})=>void }} opts
   */
  async function load(settings, opts = {}) {
    const { preferGeo = true, onCoords } = opts;
    try {
      const coords = await resolveCoords(settings, { preferGeo });
      const weather = await fetchWeather(coords.lat, coords.lon);
      if (onCoords) onCoords(coords);
      return weather;
    } catch {
      return null;
    }
  }

  return { geocodeCity, reverseGeocode, fetchWeather, getDeviceLocation, resolveCoords, load };
})();
