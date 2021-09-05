export const createActionExecutor =
  ({ actions }) =>
  async ({ type, params }) => {
    const action = actions[type];
    if (!action) throw new Error(`No action found for ${type}`);
    return action(params);
  };
