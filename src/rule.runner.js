import { createFactMapProcessor } from './fact.map.processor';
import { createActionExecutor } from './action.executor';
import { interpolateDeep } from './interpolate';

export const createRuleRunner = (validator, opts, emit) => {
  const processor = createFactMapProcessor(validator, opts, emit);
  const executor = createActionExecutor(opts, emit);
  return async ([rule, { when, ...rest }]) => {
    const ruleResults = await Promise.all(
      interpolateDeep(when, opts.context, opts.pattern, opts.resolver).map(
        processor(rule),
      ),
    );

    // create the context and evaluate whether the rules have passed or errored in a single loop
    const { passed, error, context } = ruleResults.reduce(
      ({ passed, error, context }, result) => {
        if (error) return { error };
        passed =
          passed && Object.values(result).every(({ __passed }) => __passed);
        error = Object.values(result).some(({ __error }) => __error);
        return { passed, error, context: { ...context, ...result } };
      },
      {
        passed: true,
        error: false,
        context: {},
      },
    );

    const nextContext = { ...opts.context, results: context };
    const ret = (rest = {}) => ({ [rule]: { ...rest, results: ruleResults } });

    if (error) return ret({ error: true });
    const key = passed ? 'then' : 'otherwise';
    const which = rest[key];
    if (!which) return ret();

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
                emit('error', { type: 'ActionExecutionError', action });
                return { ...action, error };
              }
            }),
          )
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
  };
};
