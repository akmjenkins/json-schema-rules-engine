import got from 'got';

export const weather = async ({ q, appId, units }) => {
  const url = `https://api.openweathermap.org/data/2.5/weather/?q=${q}&units=${units}&appid=${appId}`;
  return (await got.get(url, { responseType: 'json' })).body;
};

export const forecast = async ({ q, appId, units }) => {
  const { lat, lon } = (await weather({ q, appId, units })).coord;
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=${units}&appid=${appId}`;
  return (await got.get(url, { responseType: 'json' })).body;
};
