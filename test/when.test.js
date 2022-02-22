import Ajv from 'ajv';
import { createWhen, isWhenValid, createAjvValidator } from '../build';

describe('when', () => {
  const factmapA = {
    user: { path: 'firstName', is: { type: 'string', pattern: '^f' } },
    account: { path: 'balance', is: { type: 'number', minimum: 50 } },
  };

  const factmapB = {
    user: { path: 'lastName', is: { type: 'string', pattern: '^j' } },
    account: { path: 'balance', is: { type: 'number', exclusiveMinimum: 100 } },
  };

  const when = [factmapA, factmapB];

  const passUserA = { firstName: 'fred' };
  const passUserB = { lastName: 'jones' };
  const passAccountA = jest.fn(async () => ({ balance: 100 }));
  const passAccountB = jest.fn(async () => ({ balance: 110 }));

  const validator = jest.fn(createAjvValidator(new Ajv()));

  afterEach(() => {
    validator.mockClear();
    passAccountA.mockClear();
    passAccountB.mockClear();
  });

  const evaluate = createWhen(validator, when);

  it(`should return all results`, async () => {
    const result = await evaluate({ user: passUserA, account: passAccountA });
    expect(result).toMatchObject([
      {
        user: { result: true, value: passUserA, resolved: passUserA.firstName },
        account: { result: true, value: { balance: 100 }, resolved: 100 },
      },
      {
        user: { result: false, value: passUserA, resolved: undefined },
        account: { result: false, value: { balance: 100 }, resolved: 100 },
      },
    ]);
    expect(isWhenValid(result)).toBe(true);
  });

  it(`should return serial (first pass)`, async () => {
    expect(
      await evaluate(
        { user: passUserA, account: passAccountA },
        { serial: true },
      ),
    ).toBe(true);
    // when called serially, passAccountA
    // only needs to be called once
    expect(passAccountA).toHaveBeenCalledTimes(1);
    passAccountA.mockClear();

    // when not called serially, passAccountA
    // will be called in each fact map
    await evaluate({ user: passUserA, account: passAccountA });
    expect(passAccountA).toHaveBeenCalledTimes(2);
  });

  it(`should return serial (first fail)`, async () => {
    expect(
      await evaluate(
        { user: passUserB, account: passAccountB },
        { serial: true },
      ),
    ).toBe(true);
    // when called serially, the first factMap failed
    // to evaluate to true, so passAccountB was called again
    expect(passAccountB).toHaveBeenCalledTimes(2);
  });

  it(`should return fast`, async () => {
    // make passAccountA not resolve the first time
    // this test will (correctly) fail if we
    // 1. change this to mockImplementation
    // 2. turn off "fast"
    // 3. change to serial
    passAccountB.mockImplementationOnce(() => new Promise((res) => {}));
    expect(
      await evaluate(
        { user: passUserB, account: passAccountB },
        { fast: true },
      ),
    ).toBe(true);
  });
});
