import createRulesEngine, { RulesEngine } from '../src';
import { createAjvValidator } from './validators';

describe('events', () => {
  let engine: RulesEngine;
  let log: jest.Mock;
  let call: jest.Mock;

  beforeEach(() => {
    log = jest.fn();
    call = jest.fn();
    engine = createRulesEngine(createAjvValidator(), {
      actions: { log, call },
    });
  });

  it('should unsubscribe', async () => {
    const rules = {
      salutation: {
        when: {
          myFacts: {
            firstName: { is: { type: 'string', pattern: '^J' } },
          },
        },
        then: {
          actions: [{ type: 'log', params: { message: 'Hi friend!' } }],
        },
        otherwise: {
          actions: [{ type: 'call', params: { message: 'Who are you?' } }],
        },
      },
    };
    engine.setRules(rules);
    const subscriber = jest.fn();
    const unsub = engine.on('debug', subscriber);
    await engine.run({ firstName: 'John' });
    expect(subscriber).toHaveBeenCalled();
    unsub();
    subscriber.mockClear();
    await engine.run({ firstName: 'John' });
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('should subscribe to debug events', async () => {
    const rules = {
      salutation: {
        when: {
          myFacts: {
            firstName: { is: { type: 'string', pattern: '^J' } },
          },
        },
        then: {
          actions: [{ type: 'log', params: { message: 'Hi friend!' } }],
        },
        otherwise: {
          actions: [{ type: 'call', params: { message: 'Who are you?' } }],
        },
      },
    };
    engine.setRules(rules);
    const subscriber = jest.fn();
    const context = { firstName: 'John' };
    engine.on('debug', subscriber);
    await engine.run(context);

    expect(subscriber).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'STARTING_RULE',
        rule: 'salutation',
        interpolated: rules.salutation.when,
        context,
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'STARTING_FACT_MAP',
        rule: 'salutation',
        mapId: 'myFacts',
        factMap: rules.salutation.when.myFacts,
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: 'STARTING_FACT',
        rule: 'salutation',
        mapId: 'myFacts',
        factName: 'firstName',
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        type: 'EXECUTED_FACT',
        rule: 'salutation',
        mapId: 'myFacts',
        path: undefined,
        factName: 'firstName',
        value: context.firstName,
        resolved: context.firstName,
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        type: 'EVALUATED_FACT',
        rule: 'salutation',
        mapId: 'myFacts',
        path: undefined,
        factName: 'firstName',
        value: 'John',
        resolved: 'John',
        is: { type: 'string', pattern: '^J' },
        result: { result: true },
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({
        type: 'FINISHED_FACT_MAP',
        rule: 'salutation',
        mapId: 'myFacts',
        results: {
          firstName: { result: true, value: 'John', resolved: 'John' },
        },
        passed: true,
        error: false,
      }),
    );

    expect(subscriber).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({
        type: 'FINISHED_RULE',
        rule: 'salutation',
        interpolated: rules.salutation.when,
        context,
        result: {
          actions: [{ type: 'log', params: { message: 'Hi friend!' } }],
          results: {
            myFacts: expect.objectContaining({
              firstName: {
                result: true,
                value: 'John',
                resolved: 'John',
              },
            }),
          },
        },
      }),
    );
  });

  it.only('should emit an action error', async () => {
    const rules = {
      salutation: {
        when: {
          myFacts: { firstName: { is: { type: 'string', pattern: '^J' } } },
        },
        then: {
          actions: [
            { type: 'log', params: { message: 'Hi friend!' } },
            { type: 'call', params: { message: 'called anyway' } },
          ],
        },
      // tslint:disable-next-line
    };
    engine.setRules(rules);
    log.mockImplementationOnce(() => {
      throw new Error('nad');
    });
    engine.on('error', (o) => {
      if (o.type === 'ActionExecutionError') {
        console.log(o);
      }
    });
    await engine.run({ firstName: 'John' });

    // should actions be executed sequentially? no
    // they can be executed sequentially by allowing the "action" to be a fact
  });
});
