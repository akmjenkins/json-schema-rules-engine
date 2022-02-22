# JSON Schema Rules Engine

[![npm version](https://img.shields.io/npm/v/json-schema-rules-engine)](https://npmjs.org/package/json-schema-rules-engine)
[![codecov](https://codecov.io/gh/akmjenkins/json-schema-rules-engine/branch/main/graph/badge.svg)](https://codecov.io/gh/akmjenkins/json-schema-rules-engine)
![Build Status](https://github.com/akmjenkins/json-schema-rules-engine/actions/workflows/test.yaml/badge.svg)
[![Bundle Phobia](https://badgen.net/bundlephobia/minzip/json-schema-rules-engine)](https://bundlephobia.com/result?p=json-schema-rules-engine)

A highly configurable rules engine based on [JSON Schema](https://json-schema.org/). Inspired by the popular [JSON rules engine](https://github.com/CacheControl/json-rules-engine).

_NBD: It actually doesn't **have** to use JSON Schema, but it's suggested_

## What's Different?

v1 Was supposed to largely copy the success of [json-rules-engine] except get rid of a lot of the internal operators and replace them with userland logic (highly suggested to be provided by means of an Ajv validator)

After deeply evaluation what was needed from a json-schema-rules-engine, I was determine to provide a library that literally gave developers the bare bones data structures required for them to implement their own rules engines as they see fit.

What does this mean?

1. No actions! This rules engine is purely about evaluation, you can do what you want with the results of the evaluations.
2. No "rules". This rules engine is purely about the implementation of the pieces of the rules (a [when], a [factmap], and an [evaluator]). Glue them together how you see fit (we've got some [recipes] at the bottom)

This result is a library that is less than 100 lines of code (less code means less bugs).


## Preface

This library is primarily a predicate library, which funnily enough doesn't supply any predicates - you supply those via the [validator](#validator). It does not help (directly) in transformation of data, just evaluation of it. Aside from not supplying predicates, it doesn't do much else except opinionatedly structures logic in a way you might not have considered before to [keep things simple](#rick-hickey). The huge lack of built-in functionality in this library is why it's < 700 bytes minzipped. 

`json-schema-rules-engine` helps you separate your data from actions that may (or may not) occur as a result of that data. It does this by means of discussing data sources in terms of data fetchers and context and discussing whether that data is meaningful through schemas and validators. Retrieving data and evaluating that data are viewed as highly separate tasks to keep concerns separate and keep code :sponge:. 

No more `isSomethingTrueInMyAsyncDataFunction(...someArgs)`. Instead, we strive to do this:

```js
isSomethingTrue(
  params,
  await myAsyncDataFunction(...someArgs)
)
```

While the above might look like a trivial distinction. The ability to separate these tasks cleanly and consistently is what separates spaghetti codebases from :sponge: ones.

## Context

Context is a plain JavaScript object that consists of one or both of plain objects and [data fetchers](#data-fetchers).

### Data Fetchers

Data Fetchers are (optionally async) functions in context that are passed the context as an argument (and optionally a second argument called params, supplied by you in an [evaluator](#evaluators)). There sole job is to accept arguments and return an value. 

### Evaluators

Evaluators consist something called a "Fact Name" which is a fancy way to say a key from the context object. If that key references a [data fetcher](#data-fetchers) it calls the data fetcher (and awaits the promise, if async) and evaluates the resultant value against a schema. Evaluators can also contain a property `path` which allows you to [resolve](#resolver) nested values inside the object that was 1) returned from a data fether or 2) the value at that key in context.

```js
{
  user: {
    path: 'firstName',
    is: {
      type: 'string',
      pattern: '^f'
    }
  }
}
```
### Resolver

The resolver is used to resolve a `path`. The default one is very boring:

```js
const resolver = (subject, path) => subject && subject[path];
```

To allow you to access deeply nested properties, try supplying [get from loash](https://lodash.com/docs/4.17.15#get) or [jsonpointer](https://www.npmjs.com/package/jsonpointer) as your resolver


## License

[MIT](./LICENSE)

## Contributing

Help wanted! I'd like to create really great advanced types around the content of the facts, actions, and context given to the engine. Reach out [@akmjenkins](https://twitter.com/akmjenkins) or [akmjenkins@gmail.com](mailto:akmjenkins@gmail.com)
