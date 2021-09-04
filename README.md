# JSON Schema Rules Engine

A highly configurable rules engine based on [JSON Schema](https://json-schema.org/). Inspired by the popular [JSON rules engine](https://github.com/CacheControl/json-rules-engine).

_NBD: It actually doesn't **have** to use JSON Schema, but it's suggested_

## Features

- Highly configurable - use any type of schema to express your logic (we strongly suggest JSON Schema)
- Configurable interpolation to make highly reusable rules/actions
- Zero-dependency, extremely lightweight (under 2kb minzipped)
- Runs everywhere
- Nested conditions allow for controlling rule evaluation order
- Memoization makes it fast
- No thrown errors - errors are emitted, never thrown

## Installation

```bash
npm install json-schema-rules-engine
# or
yarn add json-schema-rules-engine
```

or, use it directly in the browser

```html
<script src="https://cdn.jsdelivr.net/npm/json-schema-rules-engine"></script>
<script>
  const engine = jsonSchemaRulesEngine({ facts, actions, rules, validator });
</script>
```

## Basic Example

```js
import Ajv2019 from 'ajv/dist/2019';
import createRulesEngine from 'json-schema-rules-engine';

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
    then: {
      actions: [
        {
          type: 'log',
          params: { message: 'Quite hot out today!' },
        },
      ],
    },
    otherwise: {
      actions: [
        {
          type: 'log',
          params: { message: 'Brrr, bundle up!' },
        },
      ],
    },
  },
};

const actions = {
  log: console.log,
};

// validate using a JSON schema via AJV
const ajv = new Ajv();
const validator = async (subject, schema) => {
  const validate = ajv.compile(schema);
  const result = await validate(subject);
  return { result };
};

const engine = createRulesEngine({ facts, rules, actions, validator });

engine.run({
  hotTemp: 20,
  city: 'Halifax',
  apiKey: 'XXXX',
  units: 'metric',
});

// check the console
```

## Concepts

- [Validator](#validator)
- [Context](#context)
- [Facts](#facts)
- [Actions](#actions)
- [Rules](#rules)
  - [FactMap](#factmap)
  - [Evaluators](#evaluators)
- [Interpolation](#context)
- [Events](#events)

## Validator

The thing about `json-schema-rules-engine` is that you don't have to use JSON schema (but you are highly encouraged to!)

You **must** provide a validator when creating a rules engine. We haven't provided one in the interest of keeping this package unopinionated and small, but here's a great one to use:

```js
import Ajv from 'Ajv';
const ajv = new Ajv();
const validator = async (subject, schema) => {
  const validate = ajv.compile(schema);
  const result = await validate(subject);
  return { result };
};
```

The validator must return an object with a `result` key that has a `boolean`. It can run async. It is used to evaluate a fact at runtime, and is passed the fact value and the schema (or otherwise serializable JSON) you have defined in your rules

```js
const rule = {
  myRule: {
    when: [
      {
        firstName: {
          is: {
            type: 'string',
            pattern: '^Joe',
          },
        },
      },
    ];
  }
}

engine.run({firstName: 'Bill'})

// the validator you provided is called like this:
const { result, ...rest } = validator(
  'Bill',
  {
    type: 'string',
    pattern: '^Joe',
  }
);
```

### Context

`context` is the name of the object the rules engine evaluates during `run`. It can be used for interpolation or even as a source of facts

```js
const context = {
  hotTemp: 20,
  city: 'Halifax',
  apiKey: 'XXXX',
  units: 'metric',
};

engine.run(context);
```

### Facts

There are two types of facts - static and functional. Functional facts come from the facts given to the rule engine when it is created (or via [setFacts](`setFacts`)). They are unary functions that return a value, synchronously or asynchronously. Check out this example weather fact that calls an the [openweather api](https://openweathermap.org/api) and returns the JSON response.

```js
const weather = async ({ query, appId, units }) => {
  const url = `https://api.openweathermap.org/data/2.5/weather/?q=${q}&units=${units}&appid=${appId}`;
  return (await fetch(url)).json();
};
```

Static facts are simply the values of the context object

### Actions

Actions, just like facts, are unary functions. They can be sync or async and can do anything. They are executed as an outcome of a rule.

```js
const saveAuditRecord = async ({ eventType, data }) => {
  await db.insert('INSERT INTO audit_log (event, data) VALUES(?,?)', [
    eventType,
    data,
  ]);
};

const engine = createRulesEngine({ actions: saveAuditRecord });
```

### Rules

Rules are written as **when**, **then**, **otherwise**. A when clause consists of an array of [`FactMap`s](#factmap). If any of the `FactMap`s evaluate to true, the properties of the `then` clause of the rule are evaluated. If not, the `otherwise` clause is evaluated.

```js
const myRule = {
  when: [
    {
      age: {
        is: {
          type: 'number',
          minimum: 30,
        },
      },
      name: {
        is: {
          type: 'string',
          pattern: '^J',
        },
      },
    },
  ],
  then: {
    actions: [
      {
        type: 'log',
        params: {
          message: 'Hi {{name}}!',
        },
      },
    ],
  },
};

const engine = createRulesEngine({ rules: { myRule } });
engine.run({ age: 31, name: 'Fred' }); // no action is fired
engine.run({ age: 32, name: 'Joe' }); // fires the log action with { message: 'Hi Joe!' }
```

#### Nesting Rules

The `then` or `otherwise` property can consist of either `actions`, but it can also contain another `when` clause. All functional facts in all [FactMaps](#factmaps) are evaluated simultaneously. By nesting `when`'s, you can cause facts to be executed serially.

```js
const myRule = {
  when: [
    {
      weather: {
        name: 'myWeatherFact',
        params: {
          query: '{{city}}',
          appId: '{{apiKey}}',
          units: '{{units}}',
        },
        path: 'main.temp',
        is: {
          type: 'number',
          minimum: 30
        }
      },
    },
  ],
  then: {
    when: [
      {
        forecast: {
          params: {
            appId: '{{apiKey}}',
            coord: '{{results.myWeatherFact.value.coord}}' // interpolate a value returned from the first fact
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
                      minimum: 20
                    }
                  }
                }
              }
            },
            minContains: 4
          }
        }
      },
      then: {
        actions: {
          type: 'log',
          params: {
            message: 'Nice week of weather coming up',
          }
        }
      }
    ],
    actions: [
      {
        type: 'log',
        params: {
          message: 'Warm one today',
        },
      },
    ],
  },
};
```

#### FactMap

A fact map is a plain object whose keys are facts (static or functional) and values are [`Evaluator`'s](#evaluator)

#### Evaluator

An evaluator is an object that specifies a JSON Schema to evaluate a fact against. If the fact is a functional fact, the evaluator can specify params to pass to the fact as an argument. A `path` can also be specified to more easily evaluate a nested property contained within the fact.

The following weather fact evaluator passes parameters to the function and specifies a schema to check the value at `main.temp` against:

```js
const myFactMap = {
  weather: {
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
};
```

You can also specify a `name` as a way to more easily interpolate the result from the

### Interpolation

Interpolation is configurable by passing the `pattern` option. By default, it uses [handlebars](https://handlebarsjs.com/)

Anything passed in via the context object given to `engine.run` is available to be interpolated _anywhere_ in a rule.

The default mechanism of resolution of an interpolated property is simple dot-notation [like property-expr](https://github.com/jquense/expr). Although if you feel like using [json path](https://www.npmjs.com/package/jsonpath) just pass it in as a `resolver` option when creating the rules engine.

In addition to `context`, actions have a special property called `results` that can be used for interpolation. Read more about results context [here](tbd)

## Events

The rules engine is also an event emitter. There are 4 types of events you can listen to

- [start](#start)
- [complete](#complete)
- [debug](#debug)
- [error](#error)

### start

Emitted as soon as you call `run` on the engine

```js
engine.on('start', ({context,facts,rules,actions}) => { ... })
```

### complete

Emitted when all rules have been evaluated AND all actions have been executed

```js
engine.on('complete', ({context}) => { ... })
```

### debug

Useful to monitor the internal execution and evaluation of facts and actions

```js
engine.on('debug',(arg) => { ... })
```

### error

Any errors thrown during fact execution/evaluation or action execution are emitted via `error`

```js
engine.on('error',({type, ...rest}) => { ... })
```

The errors that can be emitted are:

- `FactExecutionError` - errors thrown during the execution of functional facts
- `FactEvaluationError` - errors thrown during the evaluation of facts/results from facts
- `ActionExecutionError` - errors thrown during the execution of actions

## License

[MIT](./LICENSE)

## Contributing

Help wanted! I'd like to really create great advanced types around the content of the facts, actions, and context given to the engine. Reach out [@akmjenkins](https://twitter.com/akmjenkins) or [akmjenkins@gmail.com](mailto:akmjenkins@gmail.com)
