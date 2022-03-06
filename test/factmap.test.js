import Ajv from 'ajv';
import { createFactMap, createAjvValidator } from '../src';

describe('factmap', () => {
  const facts = {
    user: { path: 'firstName', is: { type: 'string', pattern: '^f' } },
    account: { path: 'balance', is: { type: 'number', minimum: 50 } },
  };

  const passUser = { firstName: 'fred' };
  const failUser = { firstName: 'notfred' };
  const passAccount = jest.fn(async () => ({ balance: 60 }));
  const failAccount = jest.fn(async () => ({ balance: 49 }));

  const validator = jest.fn(createAjvValidator(new Ajv()));

  afterEach(() => {
    validator.mockClear();
    passAccount.mockClear();
    failAccount.mockClear();
  });

  const factmap = createFactMap(validator, facts);

  it('should return fast', async () => {
    const nonResolvingFunction = jest.fn(() => new Promise((res) => {}));

    expect(
      await factmap(
        { user: failUser, account: nonResolvingFunction },
        { fast: true },
      ),
    ).toBe(false);

    const resolvingFunction = jest.fn(() => Promise.resolve({ balance: 60 }));
    expect(
      await factmap(
        { user: passUser, account: resolvingFunction },
        { fast: true },
      ),
    ).toBe(true);
  });

  it('should return complete results', async () => {
    expect(
      await factmap({ user: passUser, account: passAccount }),
    ).toMatchObject({
      user: {
        resolved: passUser.firstName,
        value: passUser,
        result: true,
      },
      account: {
        value: { balance: 60 },
        resolved: 60,
        result: true,
      },
    });
    expect(
      await factmap({ user: passUser, account: failAccount }),
    ).toMatchObject({
      user: {
        resolved: passUser.firstName,
        value: passUser,
        result: true,
      },
      account: {
        value: { balance: 49 },
        resolved: 49,
        result: false,
      },
    });
  });
});
