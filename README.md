# JSON Schema Rules Engine

A highly configurable rules engine based on [JSON Schema](https://json-schema.org/). Inspired by the popular [JSON rules engine](https://github.com/CacheControl/json-rules-engine).

_NBD: It actually doesn't **have** to use JSON Schema, but it's suggested_

## Why?

Three reasons:

1. Schema validation of a data structure can be used to implement boolean logic
2. Tools for JSON schema are everywhere and support is wide
3. Custom operators (like those in JSON rules engine) aren't sustainable. You can either make a PR for a new operator that may or may not get merged OR you have to take on the ownership in your own codebase of building and maintaining custom operators. With `json-schema-rules-engine`, you can implement new logic immediately whenever the spec is published (thanks to very actively maintained projects like [AJV](https://github.com/ajv-validator/ajv)).

## Features

- Highly configurable - use any type of schema to express your logic (we strongly suggest JSON Schema)
- Configurable interpolation to make highly reusable rules/actions
- Zero-dependency, extremely lightweight (under 2kb minzipped)
- Runs everywhere
- Nested conditions allow for controlling rule evaluation order
- [Memoization] makes it fast
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
  const engine = jsonSchemaRulesEngine(validator, { facts, actions, rules });
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
  const validate = await ajv.compile(schema);
  const result = validate(subject);
  return { result };
};

const engine = createRulesEngine(validator, { facts, rules, actions });

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

The validator is what makes `json-schema-rules-engine` so powerful. The validator is passed the resolved fact value and the schema (the value of the `is` property of an [`evaluator`]) and returns (optionally asynchronously) a `ValidatorResult`:

```ts
type ValidatorResult = {
  result: boolean;
};
```

If you want to use `json-schema-rules-engine` as was originally envisioned - to allow encoding of boolean logic by means of JSON Schema - then this is a great validator to use:

```js
import Ajv from 'Ajv';
const ajv = new Ajv();
const validator = async (subject, schema) => {
  const validate = await ajv.compile(schema);
  const result = validate(subject);
  return { result };
};

const engine = createRulesEngine(validator);
```

You can see by abstracting the JSON Schema part away from the core rules engine (by means of the `validator`) this engine can actually use **anything** to evaluate a property against. The validator is why `json-schema-rules-engine` is so small and so powerful.

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

It's important to note that all functional facts are memoized during each run of the rule engine, based on **shallow equality** of their argument. Currently, functions that accept an argument that contains values that are objects or arrays are not memoized. This will be fixed in an upcoming release.

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

Rules are written as **when**, **then**, **otherwise**. A when clause consists of an array of [`FactMap`s](#factmap), or an object whose values are [`FactMap`s](#factmap). If any of the `FactMap`s in the object or array evaluate to true, the properties of the `then` clause of the rule are evaluated. If not, the `otherwise` clause is evaluated.

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

The `then` or `otherwise` property can consist of either `actions`, but it can also contain a nested rule. All functional facts in all [FactMaps](#factmaps) are evaluated simultaneously. By nesting `when`'s, you can cause facts to be executed serially.

```js
const myRule = {
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
            coord: '{{results[0].weather.value.coord}}' // interpolate a value returned from the first fact
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

A FactMap is a plain object whose keys are facts (static or functional) and values are [`Evaluator`'s](#evaluator).

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

### Interpolation

Interpolation is configurable by passing the `pattern` option. By default, it uses [handlebars](https://handlebarsjs.com/)

Anything passed in via the context object given to `engine.run` is available to be interpolated _anywhere_ in a rule.

The default mechanism of resolution of an interpolated property is simple dot-notation [like property-expr](https://github.com/jquense/expr). Although if you feel like using [json path](https://www.npmjs.com/package/jsonpath) just pass it in as a `resolver` option when creating the rules engine.

In addition to `context`, actions have a special property called `results` that can be used for interpolation. Read more about results context [here](tbd)

### Events

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

## API/Types

- **`createRulesEngine(validator: Validator, options?: Options): RulesEngine`**

```ts
type Options = {
  facts?: Record<string,Fact>;
  rules?: Record<string,Rule>;
  actions?: Record<string,Action>;
  pattern?: RegExp; // for interpolation
  resolver?: (subject: Record<string,any>, path: string) => any
};

interface RulesEngine {
  setRules(rulesPatch: Patch<Rules>): void;
  setFacts(factsPatch: Patch<Facts>): void;
  setActions(actionsPatch: Patch<Actions>): void;
  on('debug', subscriber: DebugSubscriber): Unsubscribe
  on('error', subscriber: ErrorSubscriber): Unsubscribe
  on('start', subscriber: StartSubscriber): Unsubscribe
  on('complete', subscriber: CompleteSubscriber): Unsubscribe
  run(context: Record<string, any>): Promise<EngineResults>;
}

type PatchFunction<T> = (o: T) => T;
type Patch<T> = PatchFunction<T> | Partial<T>;
```

## License

[MIT](./LICENSE)

## Contributing

Help wanted! I'd like to create really great advanced types around the content of the facts, actions, and context given to the engine. Reach out [@akmjenkins](https://twitter.com/akmjenkins) or [akmjenkins@gmail.com](mailto:akmjenkins@gmail.com)
