export const parseResults = (r) =>
  r.reduce(
    (acc, result) => {
      acc.passed =
        acc.passed || Object.values(result).every(({ __passed }) => __passed);
      acc.error =
        acc.error && Object.values(result).some(({ __error }) => __error);
      acc.results = { ...acc.results, ...result };
      return acc;
    },
    { passed: false, error: true, results: {} },
  );
