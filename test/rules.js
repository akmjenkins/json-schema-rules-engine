export const dailyTemp = {
  when: [
    {
      weather: {
        name: 'checkTemp',
        params: {
          q: '{{query}}',
          units: '{{units}}',
          appId: '{{appId}}',
        },
        path: 'main.temp',
        is: {
          anyOf: [
            {
              type: 'number',
              minimum: '{{dailyTemp}}',
            },
          ],
        },
      },
    },
  ],
  then: [
    {
      type: 'log',
      params: {
        someParam: '{{results.checkTemp.value.coord}}',
        resolved: '{{results[0].weather.resolved}}',
      },
    },
  ],
};
