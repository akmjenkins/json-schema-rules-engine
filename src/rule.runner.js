import { createFactMapProcessor } from './fact.map.processor';
import { createActionExecutor } from './action.executor';
import { interpolateDeep } from './interpolate';
import { parseResults } from './parse.results';

export const createRuleRunner = (validator, opts, emit) => {
  const processor = createFactMapProcessor(validator, opts, emit);
  const executor = createActionExecutor(opts, emit);
  return async ([rule, { when, ...rest }]) => {
    try {
      // interpolated can be an array FactMap[] OR an object NamedFactMap
      const interpolated = interpolateDeep(
        when,
        opts.context,
        opts.pattern,
        opts.resolver,
      );

      emit('debug', {
        type: 'STARTING_RULE',
        rule,
        interpolated,
        context: opts.context,
      });

      const process = processor(rule);

      const { passed, error, results } = parseResults(
        await Promise.all(
          Array.isArray(interpolated)
            ? interpolated.map(process)
            : Object.entries(interpolated).map(async ([k, v]) => process(v, k)),
        ),
      );

      const ret = (rest = {}) => ({
        [rule]: {
          __error: error,
          __passed: passed,
          ...rest,
          results,
        },
      });

      const key = passed ? 'then' : 'otherwise';
      const which = rest[key];
      if (error || !which) return ret();
      const nextContext = { ...opts.context, results };
      const { actions, when: nextWhen } = which;

      const [actionResults, nestedReults] = await Promise.all([
        actions
          ? Promise.all(
              interpolateDeep(
                actions,
                nextContext,
                opts.pattern,
                opts.resolver,
              ).map(async (action) => {
                try {
                  return { ...action, result: await executor(action) };
                } catch (error) {
                  emit('error', {
                    type: 'ActionExecutionError',
                    rule,
                    action,
                    error,
                    params: action.params,
                  });
                  return { ...action, error };
                }
              }),
            ).then((actionResults) => {
              // we've effectively finished this rule. The nested rules, if any, will print their own debug messages (I think this is acceptable behavior?)
              emit('debug', {
                type: 'FINISHED_RULE',
                rule,
                interpolated,
                context: opts.context,
                result: { actions: actionResults, results },
              });
              return actionResults;
            })
          : null,
        nextWhen
          ? createRuleRunner(
              validator,
              { ...opts, context: nextContext },
              emit,
            )([`${rule}.${key}`, which])
          : null,
      ]);

      const toRet = ret({ actions: actionResults });

      return nestedReults ? { ...toRet, ...nestedReults } : toRet;
    } catch (error) {
      emit('error', { type: 'RuleExecutionError', error });
      return { [rule]: { error: true } };
    }
  };
};
