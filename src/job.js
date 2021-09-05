import { createRuleRunner } from './rule.runner';
import { memoRecord } from './utils';

export const createJob = (validator, opts, emit) => {
  const { rules, facts, ...options } = opts;
  const memoed = memoRecord(facts);
  const checkRule = createRuleRunner(
    validator,
    { ...options, facts: memoed },
    emit,
  );

  return async () =>
    (await Promise.all(Object.entries(rules).map(checkRule))).reduce(
      (a, r) => ({ ...a, ...r }),
      {},
    );
};
