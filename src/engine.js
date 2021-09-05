import { interpolateDeep } from './interpolate';
import { defaults } from './options';
import { patch, memoRecord } from './utils';

const createFactEvaluator =
  (context, facts, { validator, resolver }, emit) =>
  (rule, index) =>
  async ([factName, { name, params, path, is }]) => {
    emit('debug', {
      type: 'STARTING_FACT',
      fact: factName,
      rule,
      index,
      params,
    });
    const fact = facts[factName] || context[factName];
    try {
      const value = await (typeof fact === 'function' ? fact(params) : fact);
      const resolved = path ? resolver(value, path) : value;
      emit('debug', {
        type: 'EXECUTED_FACT',
        fact: factName,
        rule,
        index,
        params,
        value,
        resolved,
      });
      try {
        const result = await validator(resolved, is);
        emit('debug', {
          type: 'EVALUATED_FACT',
          fact: factName,
          rule,
          index,
          value,
          resolved,
          is,
          result,
        });
        return {
          factName,
          name,
          value,
          resolved,
          ...result,
        };
      } catch (error) {
        emit('error', {
          type: 'FactEvaluationError',
          rule,
          error,
          context,
          factName,
          value,
          resolved,
          path,
          is,
        });
        return { error: true };
      }
    } catch (error) {
      emit('error', {
        type: 'FactExecutionError',
        rule,
        error,
        context,
        factName,
        params,
      });
      return { error: true };
    }
  };

const createFactmapChecker = (context, facts, options, emit) => {
  const evaluator = createFactEvaluator(context, facts, options, emit);
  return (rule) => {
    return async (factMap, index) => {
      emit('debug', {
        type: 'STARTING_FACT_MAP',
        rule,
        index,
      });
      const results = await Promise.all(
        Object.entries(factMap).map(evaluator(rule, index)),
      );
      return results.reduce(
        (acc, { factName, ...rest }) => ({ ...acc, [factName]: rest }),
        {},
      );
    };
  };
};

const getRuleResults = (results) => {
  return Object.values(results).reduce(
    (acc, resultMap) => {
      if (acc.error) return acc;
      const error = Object.values(resultMap).some(({ error }) => error);
      return {
        error,
        passed:
          !error &&
          acc.passed &&
          Object.values(resultMap).every(({ result }) => result),
      };
    },
    {
      passed: true,
      error: false,
    },
  );
};

const getResultsContext = (results) =>
  results.reduce(
    (acc, r) =>
      Object.values(r).reduce(
        (a, { name, ...rest }) => (name ? { ...a, [name]: rest } : a),
        acc,
      ),
    { ...results },
  );

const createActionExecutor = (actions, opts, emit) => (what, context) =>
  Promise.all(
    interpolateDeep(what, context, opts.pattern, opts.resolver).map(
      async ({ type, params }) => {
        try {
          if (!actions[type]) throw new Error(`No action found for ${type}`);
          await actions[type](params);
        } catch (error) {
          emit('error', {
            type: 'ActionExecutionError',
            action: type,
            params,
            error,
          });
        }
      },
    ),
  );

const createRuleRunner = (context, facts, actions, opts, emit) => {
  const checker = createFactmapChecker(context, facts, opts, emit);
  const executor = createActionExecutor(actions, opts, emit);
  return async ([rule, { when, ...rest }]) => {
    const interpolatedRule = interpolateDeep(
      when,
      context,
      opts.pattern,
      opts.resolver,
    );
    emit('debug', {
      type: 'STARTING_RULE',
      rule,
      interpolated: interpolatedRule,
    });
    const results = await Promise.all(interpolatedRule.map(checker(rule)));
    const { passed, error } = getRuleResults(results);
    const resultsContext = getResultsContext(results);
    emit('debug', {
      type: 'FINISHED_RULE',
      rule,
      results,
      passed,
      error,
      context: resultsContext,
    });
    if (error) return;
    const key = passed ? 'then' : 'otherwise';
    const which = rest[key];
    if (!which) return;
    const nextContext = {
      ...context,
      results: { ...(context.results || {}), ...resultsContext },
    };

    return Promise.all([
      which.when
        ? createRuleRunner(
            nextContext,
            facts,
            actions,
            opts,
            emit,
          )([`${rule}.${key}`, which])
        : null,
      which.actions ? executor(which.actions, nextContext) : null,
    ]);
  };
};

export const createRulesEngine = ({
  facts = {},
  actions = {},
  rules = {},
  ...options
} = {}) => {
  options = { ...defaults, ...options };

  if (!options.validator) throw new Error('A validator is required');

  const eventMap = new Map();

  const emit = (event, a) => (eventMap.get(event) || []).forEach((s) => s(a));

  const on = (event, subscriber) => {
    if (!eventMap.get(event)) eventMap.set(event, new Set());
    eventMap.get(event).add(subscriber);
    return () => eventMap.get(event).delete(subscriber);
  };

  return {
    setFacts: (next) => (facts = patch(next, facts)),
    setActions: (next) => (actions = patch(next, actions)),
    setRules: (next) => (rules = patch(next, rules)),
    run: async (context = {}) => {
      emit('start', { context, facts, rules, actions });
      const runner = createRuleRunner(
        context,
        memoRecord(facts),
        actions,
        options,
        emit,
      );
      await Promise.all(Object.entries(rules).map(runner));
      emit('complete', { context });
    },
    on,
  };
};
