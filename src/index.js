import { interpolateDeep } from './interpolate';
import { defaults } from './options';
import { patch, memoRecord } from './utils';

const createFactEvaluator =
  (context, facts, { validator, resolver }, emit) =>
  (rule) => {
    return async ([factName, { name, params, path, is }]) => {
      const fact = facts[factName] || context[factName];
      try {
        const value = await (typeof fact === 'function' ? fact(params) : fact);
        const resolved = path ? resolver(value, path) : value;
        try {
          const result = await validator(resolved, is);
          return {
            factName,
            name,
            value,
            resolved,
            ...result,
          };
        } catch (err) {
          emit('error', {
            type: 'FactEvaluationError',
            rule,
            err,
            context,
            factName,
            value,
            resolved,
            path,
            is,
          });
          return { error: true };
        }
      } catch (err) {
        emit('error', {
          type: 'FactExecutionError',
          rule,
          err,
          context,
          factName,
          params,
        });
        return { error: true };
      }
    };
  };

const createConditionChecker = (context, facts, options, emit) => {
  const evaluator = createFactEvaluator(context, facts, options, emit);
  return async (conditionMap) => {
    const results = await Promise.all(
      Object.entries(conditionMap).map(evaluator),
    );
    return results.reduce(
      (acc, { factName, ...rest }) => ({ ...acc, [factName]: rest }),
      {},
    );
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

const createActionExecutor = (actions, opts, emit) => (what, context) => {
  interpolateDeep(what, context, opts.pattern, opts.resolver).forEach(
    async ({ action, params }) => {
      try {
        await actions[action](params);
      } catch (err) {
        emit('error', {
          type: 'ActionExecutionError',
          action,
          params,
          err,
        });
      }
    },
  );
};

const createRuleRunner = (context, facts, actions, opts, emit) => {
  const checker = createConditionChecker(context, facts, opts, emit);
  const executor = createActionExecutor(actions, opts, emit);
  return async ([rule, { when, then, otherwise }]) => {
    emit('debug', `starting to run rule ${rule}`);
    const interpolatedRule = interpolateDeep(
      when,
      context,
      opts.pattern,
      opts.resolver,
    );
    const results = await Promise.all(interpolatedRule.map(checker(rule)));
    const { passed, error } = getRuleResults(results);
    if (error) return;
    const which = passed ? then : otherwise;
    const resultsContext = getResultsContext(results);
    emit('debug', `finished running ${rule}`, {
      passed,
      error,
      results: resultsContext,
    });
    if (!which) return;

    const actionContext = { ...context, results: resultsContext };
    // nested rules!
    if (which.when)
      return createRuleRunner(
        actionContext,
        facts,
        actions,
        opts,
        emit,
      )([rule, which]);

    executor(which, actionContext);
  };
};

const createRulesEngine = ({
  facts = {},
  actions = {},
  rules = {},
  ...options
} = {}) => {
  options = { ...defaults, ...options };
  const eventMap = new Map();

  const emit = (event, ...args) =>
    (eventMap.get(event) || []).forEach((s) => s(...args));

  const off = (event, subscriber) => {
    eventMap.get(event)?.delete(subscriber);
  };

  const on = (event, subscriber) => {
    if (!eventMap.get(event)) eventMap.set(event, new Set());
    eventMap.get(event).add(subscriber);
    return () => off(event, subscriber);
  };

  return {
    setFacts: (next) => (facts = patch(next, facts)),
    setActions: (next) => (actions = patch(next, actions)),
    setRules: (next) => (rules = patch(next, rules)),
    run: async (context) => {
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
    off,
  };
};

export default createRulesEngine;
