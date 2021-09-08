export const parseResults = (r) =>
  r.reduce(
    (acc, result) => {
      if (acc.error) return acc;
      acc.passed =
        acc.passed && Object.values(result).every(({ __passed }) => __passed);
      acc.error = Object.values(result).some(({ __error }) => __error);
      acc.results = { ...acc.results, ...result };
      return acc;
    },
    { passed: true, error: false, results: {} },
  );
