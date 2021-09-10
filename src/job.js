import { createRuleRunner } from './rule.runner';
import { memoRecord } from './memo';

export const createJob = (validator, opts, emit) => {
  const { rules, facts, ...options } = opts;
  const memoed = memoRecord(facts, opts.memoizer);
  const checkRule = createRuleRunner(
    validator,
    { ...options, facts: memoed },
    emit,
  );

  return async () =>
    (
      await Promise.all(
        Array.isArray(rules)
          ? rules.map((r, i) => checkRule([i, r]))
          : Object.entries(rules).map(checkRule),
      )
    ).reduce((a, r) => ({ ...a, ...r }), {});
};
