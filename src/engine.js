import { defaults } from './options';
import { patch } from './utils';
import { createJob } from './job';

export const createRulesEngine = (
  validator,
  { facts = {}, actions = {}, rules = {}, ...options } = {},
) => {
  options = { ...defaults, ...options };

  if (!validator) throw new Error('A validator is required');

  const eventMap = new Map();

  const emit = (event, a) => (eventMap.get(event) || []).forEach((s) => s(a));

  const on = (event, subscriber) => {
    const set = eventMap.get(event);
    set ? set.add(subscriber) : eventMap.set(event, new Set([subscriber]));
    return () => eventMap.get(event).delete(subscriber);
  };

  return {
    setFacts: (next) => (facts = patch(next, facts)),
    setActions: (next) => (actions = patch(next, actions)),
    setRules: (next) => (rules = patch(next, rules)),
    run: async (context = {}) => {
      emit('start', { context, facts, rules, actions });
      const execute = createJob(
        validator,
        {
          ...options,
          context,
          facts,
          rules,
          actions,
        },
        emit,
      );

      const results = await execute();
      emit('complete', { context, results });
      return results;
    },
    on,
  };
};
