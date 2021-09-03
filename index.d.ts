type UnaryAsync = (arg: any) => unknown | Promise<unknown>;

type FunctionalFacts = Record<string, UnaryAsync>;
type Actions = Record<string, UnaryAsync>;

type Validator = (object: any, schema: any) => { result: boolean };

type Unsubscribe = () => void;

type RuleMap = Record<string, Rule>;

type Action = {
  type: string;
  params?: unknown;
};

type RuleActions = {
  actions: Action[];
};

type Rule = {
  when: FactMap[];
  then?: RuleActions | Rule | (Rule & RuleActions);
  otherwise?: RuleActions | Rule | (Rule & RuleActions);
};

type Options = {
  validator: Validator;
  facts?: FunctionalFacts;
  actions: Actions;
  rules?: Rules;
};

interface RulesEngine {
  setRules(rules: Rules): void;
  setActions(actions: Actions): void;
  setFacts(facts: Facts): void;
  run(context: any): Promise<void>;
  off(event: 'debug' | 'error' | 'start' | 'complete', cb: () => void): void;
  on(event: 'debug', cb: (state: State) => void): Unsubscribe;
  on(event: 'start', cb: (platform: NodeJS.Platform) => void): Unsubscribe;
  on(event: 'complete', cb: (address: string) => void): Unsubscribe;
  on(event: 'error', cb: (address: string) => void): Unsubscribe;
}

declare function createRulesEngine(options: Options): RulesEngine;

export default createRulesEngine;
