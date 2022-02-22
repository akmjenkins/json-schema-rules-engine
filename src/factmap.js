import { createEvaluator } from './evaluator';

export const createFactMap = (validator, map, options) => {
  const evaluators = Object.entries(map).map(([factName, config]) => [
    factName,
    createEvaluator(validator, factName, config, options),
  ]);

  return async (context, options) => {
    const results = evaluators.map(async ([name, evaluate]) => [
      name,
      await evaluate(context, options),
    ]);

    if (options?.fast)
      return new Promise((res) =>
        Promise.all(
          results.map((r) =>
            r.then(([_, { result }]) => !result && res(false)),
          ),
        ).then(() => res(true)),
      );

    return (await Promise.all(results)).reduce(
      (acc, [k, v]) => ({ ...acc, [k]: v }),
      {},
    );
  };
};
