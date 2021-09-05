import { createEvaluator } from './evaluator';

export const createFactMapProcessor = (validator, opts, emit) => (rule) => {
  const evaluator = createEvaluator(validator, opts, emit, rule);
  return async (factMap, id) => {
    // flags for if there was an error processing the fact map
    // and if all evaluations in the fact map passed
    let error = false;
    let passed = true;

    const results = (
      await Promise.all(Object.entries(factMap).map(evaluator(id)))
    ).reduce((acc, { factName, ...rest }) => {
      if (error) return acc;
      error = error || !!rest.error;
      passed = !error && passed && rest.result;
      acc[factName] = rest;
      return acc;
    }, {});

    // return the results in the same form they were passed in
    return {
      [id]: {
        ...results,
        __passed: passed,
        __error: error,
      },
    };
  };
};
