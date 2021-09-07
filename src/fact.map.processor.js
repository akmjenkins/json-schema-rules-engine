import { createEvaluator } from './evaluator';

export const createFactMapProcessor = (validator, opts, emit) => (rule) => {
  const evaluator = createEvaluator(validator, opts, emit, rule);
  return async (factMap, mapId) => {
    emit('debug', { type: 'STARTING_FACT_MAP', rule, mapId, factMap });

    // flags for if there was an error processing the fact map
    // and if all evaluations in the fact map passed
    let error = false;
    let passed = true;

    const results = (
      await Promise.all(Object.entries(factMap).map(evaluator(mapId)))
    ).reduce((acc, { factName, ...rest }) => {
      if (error) return acc;
      error = error || !!rest.error;
      passed = !error && passed && rest.result;
      acc[factName] = rest;
      return acc;
    }, {});

    emit('debug', {
      type: 'FINISHED_FACT_MAP',
      rule,
      mapId,
      results,
      passed,
      error,
    });

    return {
      [mapId]: {
        ...results,
        __passed: passed,
        __error: error,
      },
    };
  };
};
