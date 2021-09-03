# JSON Schema Rules Engine

A highly configurable rules engine based on [JSON Schema](https://json-schema.org/). Inspired by the popular [JSON rules engine](https://github.com/CacheControl/json-rules-engine).

_NBD: It actually doesn't **have** to use JSON Schema, but it's suggested_

## Features

- Highly configurable - use any type of schema to express your logic (we strongly suggest the JSON Schema Standard)
- Configurable interpolation to make highly reusable rules/actions
- Zero-dependency, extremely lightweight (under 2kb minzipped)
- Runs everywhere
- Nested conditions allow for sequential evaluation of facts
- Memoization makes it fast
- No thrown errors - errors are emitted, never thrown

## Installation

```bash
npm install json-schema-rules-engine
# or
yarn add json-schema-rules-engine
```

## Basic Example

```js
import createRulesEngine from 'json-schema-rules-engine';
import { createAjvValidator } from 'json-schema-rules-engine/validators';

const facts = {
  weather: async ({ query, appId, units }) => {
    const url = `https://api.openweathermap.org/data/2.5/weather/?q=${q}&units=${units}&appid=${appId}`;
    return (await fetch(url)).json();
  },
};

const rules = {
  dailyTemp: {
    when: [
      {
        weather: {
          name: 'checkTemp',
          params: {
            query: '{{city}}',
            appId: '{{apiKey}}',
            units: '{{units}}',
          },
          path: 'main.temp',
          is: {
            type: 'number',
            minimum: '{{hotTemp}}',
          },
        },
      },
    ],
    then: [
      {
        action: 'log',
        params: {
          message: 'Quite hot out today - it is {{results.checkTemp.resolved}}',
        },
      },
    ],
    otherwise: [
      {
        action: 'log',
        params: {
          message:
            'Brrr, bundle up - it is only {{results.checkTemp.resolved}}',
        },
      },
    ],
  },
};

const actions = {
  log: console.log,
};

// validate using a JSON schema via AJV
const validator = createAjvValidator();

const engine = createRulesEngine({ facts, rules, actions, validator });

engine.run({
  hotTemp: 20,
  city: 'Halifax',
  apiKey: 'XXXX',
  units: 'metric',
});

// check the console
```

## Interpolation

Interpolation is configurable by passing the `pattern` option. By default, it uses [handlebars](https://handlebarsjs.com/)

Anything passed in via the context object given to `engine.run` is available to be interpolated _anywhere_ in a rule.

The default mechanism of resolution of an interpolated property is simple dot-notation [like property-expr](https://github.com/jquense/expr). Although if you feel like using [json path](https://www.npmjs.com/package/jsonpath) just pass it in as a `resolver` option when creating the rules engine.

In addition to `context`, actions have a special property called `results` that can be used for interpolation. Read more about results context [here](tbd)

## API

TO DO

## Debugging

To monitor the evalation of the rules, just add a debug listener

```js
import createRulesEngine from 'json-schema-rules-engine';

const engine = createRulesEngine(options);
engine.on('debug', console.log);
engine.run(context);
```

## License

[MIT](./LICENSE)
