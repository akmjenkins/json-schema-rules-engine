import { createFactMapProcessor } from './fact.map.processor';
import { createActionExecutor } from './action.executor';
import { interpolateDeep } from './interpolate';
import { parseResults } from './parse.results';

export const createRuleRunner = (validator, opts, emit) => {
  const processor = createFactMapProcessor(validator, opts, emit);
  const executor = createActionExecutor(opts, emit);
  const { context, pattern, resolver } = opts;
  return async ([rule, { when, ...rest }]) => {
    try {
      // interpolated can be an array FactMap[] OR an object NamedFactMap
      const interpolated = interpolateDeep(when, context, pattern, resolver);
      emit('debug', { type: 'STARTING_RULE', rule, interpolated, context });

      const process = processor(rule);

      const { passed, error, results } = parseResults(
        await Promise.all(
          Array.isArray(interpolated)
            ? interpolated.map(process)
            : Object.entries(interpolated).map(async ([k, v]) => process(v, k)),
        ),
      );

      const ret = (rest = {}) => ({
        [rule]: { error, passed, ...rest, results },
      });

      const key = passed ? 'then' : 'otherwise';
      const which = rest[key];
      if (error || !which) return ret();
      const nextContext = { ...context, results };
      const { actions = [], when: nextWhen } = which;
      const [actionResults, nestedResults] = await Promise.all([
        executor(actions, nextContext, rule).then((actionResults) => {
          // we've effectively finished this rule. The nested rules, if any, will print their own debug messages (I think this is acceptable behavior?)
          emit('debug', {
            type: 'FINISHED_RULE',
            rule,
            interpolated,
            context,
            result: { actions: actionResults, results },
          });
          return actionResults;
        }),
        nextWhen
          ? createRuleRunner(
              validator,
              { ...opts, context: nextContext },
              emit,
            )([`${rule}.${key}`, which])
          : null,
      ]);
      const toRet = ret({ actions: actionResults });
      return nestedResults ? { ...toRet, ...nestedResults } : toRet;
    } catch (error) {
      emit('error', { type: 'RuleExecutionError', error });
      return { [rule]: { error: true } };
    }
  };
};
