export const weatherRule = {
  when: [
    {
      weather: {
        name: 'weather1',
        params: {
          q: '{{query}}',
          appId: '{{apiKey}}',
          units: '{{units}}',
        },
        is: { type: 'object' },
      },
    },
  ],
  then: {
    when: [
      {
        forecast: {
          name: 'forecast',
          params: {
            coord: '{{results.weather1.value.coord}}',
            appId: '{{apiKey}}',
            units: '{{units}}',
          },
          path: 'daily',
          is: {
            type: 'array',
            contains: {
              type: 'object',
              properties: {
                temp: {
                  type: 'object',
                  properties: {
                    max: {
                      type: 'number',
                      minimum: '{{minimumWarmTemp}}',
                    },
                  },
                },
              },
            },
            minContains: '{{minimumWarmDays}}',
          },
        },
      },
    ],
    then: {
      actions: [
        {
          type: 'log',
          params: {
            weather: '{{results.weather1.value}}',
            forecast: '{{results.forecast.resolved}}',
          },
        },
      ],
    },
    otherwise: {
      actions: [
        {
          type: 'log',
          params: {
            forecast: '{{results.forecast.value.daily}}',
          },
        },
      ],
    },
  },
};

export const salutation = {
  when: [
    {
      firstName: {
        is: {
          type: 'string',
          const: 'Adam',
        },
      },
    },
    {
      firstName: {
        is: {
          type: 'string',
          const: 'Janet',
        },
      },
    },
  ],
  then: {
    actions: [
      {
        type: 'salute',
        params: {
          message: 'Hi there {{firstName}}!',
        },
      },
    ],
  },
  otherwise: {
    actions: {
      type: 'shrugoff',
      params: { name: '{{firstName}}' },
    },
  },
};
