type UnaryFunction = (arg: any) => MaybePromise<unknown>;

type Facts = Record<string, UnaryFunction>;
type Actions = Record<string, UnaryFunction>;
type Rules = Record<string, Rule>;
export type Rule = {
  when: FactMap[];
  then?: RuleActions | Rule | (Rule & RuleActions);
  otherwise?: RuleActions | Rule | (Rule & RuleActions);
};

type MaybePromise<T> = T | Promise<T>;

type Action = {
  type: string;
  params?: unknown;
};

type RuleActions = {
  actions: Action[];
};

type FactMap = Record<string, Condition>;
type Condition = {
  params?: Record<string, any>;
  path?: string;
  is: Record<string, any>;
};

interface ValidatorResult {
  result: boolean;
}

type Validator = (subject: any, schema: any) => MaybePromise<ValidatorResult>;

type Unsubscribe = () => void;

type Options = {
  validator: Validator;
  facts?: Facts;
  actions?: Actions;
  rules?: Rules;
  pattern?: RegExp;
  resolver?: (path: string) => any;
};

type StartingFactMapEvent = {
  type: 'STARTING_FACT_MAP';
  rule: string;
  index: number;
};

type StartingFactEvent = {
  type: 'STARTING_FACT';
  rule: string;
  index: number;
};

type ExecutedFactEvent = {
  type: 'EXECUTED_FACT';
  rule: string;
  index: number;
  params: any;
  value: any;
  resolved: any;
};

type EvaluatedFactEvent = {
  type: 'EVALUATED_FACT';
  rule: string;
  index: number;
  value: any;
  resolved: any;
  is: Record<string, any>;
  result: ValidatorResult;
};

type FactEvaluationError = {
  type: 'FactEvaluationError';
  rule: string;
  error: Error;
  context: Context;
  factName: string;
  value: any;
  resolved: any;
  path?: string;
  is: Record<string, any>;
};

type FactExecutionError = {
  type: 'FactExecutionError';
  rule: string;
  index: number;
  error: Error;
  context: Context;
  factName: string;
  params?: Record<string, any>;
};

type ActionExecutionError = {
  type: 'ActionExecutionError';
  action: string;
  params?: Record<string, any>;
  error: Error;
};

type DebugEvent =
  | StartingFactMapEvent
  | StartingFactEvent
  | ExecutedFactEvent
  | EvaluatedFactEvent;
type ErrorEvent =
  | FactEvaluationError
  | FactExecutionError
  | ActionExecutionError;
type StartEvent = {
  context: Context;
  facts: Facts;
  rules: Rules;
  actions: Actions;
};
type CompleteEvent = {
  context: Context;
};

type DebugSubscriber = (event: DebugEvent) => void;
type ErrorSubscriber = (event: ErrorEvent) => void;
type StartSubscriber = (event: StartEvent) => void;
type CompleteSubscriber = (event: CompleteEvent) => void;

type Subscriber =
  | DebugSubscriber
  | ErrorSubscriber
  | StartSubscriber
  | CompleteSubscriber;

type Context = Record<string, any>;

type PatchFunction<T> = (o: T) => T;

type Patch<T> = PatchFunction<T> | Partial<T>;

export interface RulesEngine {
  setRules(rules: Patch<Rules>): void;
  setActions(actions: Patch<Actions>): void;
  setFacts(facts: Patch<Facts>): void;
  run(context?: Context): Promise<void>;
  on(event: 'debug', subscriber: DebugSubscriber): Unsubscribe;
  on(event: 'start', subscriber: StartSubscriber): Unsubscribe;
  on(event: 'complete', subscriber: CompleteSubscriber): Unsubscribe;
  on(event: 'error', subscriber: ErrorSubscriber): Unsubscribe;
}

export function createRulesEngine(options: Options): RulesEngine;
