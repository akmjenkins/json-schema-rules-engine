import { createFactMap } from './factmap';

export const createWhen = (validator, when, options) => {
  const maps = when.map((e) => createFactMap(validator, e, options));

  return (context, options = {}) => {
    const { serial, fast } = options;
    const callables = maps.map(
      (e) => () => e(context, serial ? { ...options, fast: true } : options),
    );

    if (serial)
      return callables.reduce(
        async (acc, c) => ((await acc) ? acc : c()),
        false,
      );

    if (fast)
      return new Promise((res) =>
        Promise.all(callables.map((c) => c().then((v) => v && res(true)))).then(
          () => res(false),
        ),
      );

    return Promise.all(maps.map((e) => e(context, options)));
  };
};
