import { interpolateDeep } from './interpolate';

export const createActionExecutor =
  ({ actions, pattern, resolver }, emit) =>
  (toExecute, nextContext, rule) =>
    Promise.all(
      interpolateDeep(toExecute, nextContext, pattern, resolver).map(
        async (action) => {
          const { type, params } = action;
          try {
            const fn = actions[type];
            if (!fn) throw new Error(`No action found for ${type}`);
            return { ...action, result: await fn(params) };
          } catch (error) {
            emit('error', {
              type: 'ActionExecutionError',
              rule,
              action: type,
              error,
              params,
            });
            return { ...action, error };
          }
        },
      ),
    );
