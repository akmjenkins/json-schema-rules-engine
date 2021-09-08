import { shallowEqual } from './utils';
export const memo =
  (fn, check = shallowEqual, args, last) =>
  (...inner) =>
    args &&
    inner.length === args.length &&
    inner.every((a, i) => check(a, args[i]))
      ? last
      : (last = fn(...(args = inner)));

export const memoRecord = (record, check) =>
  Object.entries(record).reduce(
    (acc = {}, [k, v]) => ({ ...acc, [k]: memo(v, check) }),
    {},
  );
