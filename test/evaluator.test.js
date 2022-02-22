import Ajv from 'ajv';
import { get } from 'lodash';
import { createEvaluator, createAjvValidator } from '../build';

describe('evaluator', () => {
  const factName = 'user';
  const config = {
    path: 'firstName',
    is: { type: 'string', pattern: '^b' },
  };

  const passContext = { user: { firstName: 'bob' } };
  const failContextA = { user: { firstName: 'jill' } };
  const failContextB = { user: { lastName: 'jill' } };
  const failContextC = { foo: 'bar' };

  const validator = jest.fn(createAjvValidator(new Ajv()));

  afterEach(() => {
    validator.mockClear();
  });

  it('should throw an error if no validator is supplied', () => {
    expect(() => createEvaluator(null, factName, config)).toThrow(
      'A validator is required',
    );
  });

  it('should throw an error if no factName is supplied', () => {
    expect(() => createEvaluator(validator, null, config)).toThrow(
      'You must supply a fact name',
    );
  });

  it('should return the result (pass)', async () => {
    const evaluate = createEvaluator(validator, factName, config);
    const result = await evaluate(passContext);

    expect(result).toEqual(
      expect.objectContaining({
        result: true,
        value: passContext.user,
        resolved: passContext.user.firstName,
      }),
    );
  });

  it('should return the result (fail)', async () => {
    const evaluate = createEvaluator(validator, factName, config);

    expect(await evaluate(failContextA)).toEqual(
      expect.objectContaining({
        result: false,
        value: failContextA.user,
        resolved: failContextA.user.firstName,
      }),
    );

    expect(await evaluate(failContextB)).toEqual(
      expect.objectContaining({
        result: false,
        value: failContextB.user,
        resolved: failContextB.user.firstName,
      }),
    );

    expect(await evaluate(failContextC)).toEqual(
      expect.objectContaining({
        result: false,
        value: failContextC.user,
        resolved: failContextC.user?.firstName,
      }),
    );
  });

  it('should accept a custom resolver', async () => {
    const config = {
      path: 'address.street',
      is: {
        type: 'string',
        pattern: 'fake street',
      },
    };
    const evaluate = createEvaluator(validator, factName, config, {
      resolver: get,
    });

    const passingContext = {
      [factName]: { address: { street: '123 fake street' } },
    };

    const failingContext = {
      [factName]: { address: { street: '123 farm street' } },
    };
    expect(await evaluate(passingContext)).toMatchObject({ result: true });
    expect(await evaluate(failingContext)).toMatchObject({ result: false });
  });

  it('should call a function with params and context', async () => {
    const spy = jest.fn();
    const params = [4, 5, 6];
    const evaluate = createEvaluator(validator, factName, {
      ...config,
      params,
    });
    const otherContext = {
      subscription: '123',
      foo: 'bar',
      baz: [1, 2, 3],
    };
    expect(
      await evaluate({
        ...otherContext,
        [factName]: spy.mockResolvedValue(passContext.user),
      }),
    ).toMatchObject({ result: true });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining(otherContext),
      params,
    );
  });
});
