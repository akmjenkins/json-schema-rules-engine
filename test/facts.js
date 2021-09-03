import fetch from 'node-fetch';

export const weather = async ({ q, appId, units }) => {
  const url = `https://api.openweathermap.org/data/2.5/weather/?q=${q}&units=${units}&appid=${appId}`;
  return (await fetch(url)).json();
};

export const forecast = async ({ appId, coord, units }) => {
  const { lat, lon } = coord;
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=${units}&appid=${appId}&exclude=hourly,minutely`;
  return (await fetch(url)).json();
};
