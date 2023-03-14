/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EventObject,
  BaseActionObject,
  ActionType,
  SingleOrArray,
  StateSchema,
  Mapper,
  PropertyMapper,
  DoneEventObject,
  Condition,
  StateValue,
  MetaObject,
  DoneInvokeEvent,
  TransitionConfigTarget,
  TransitionTarget,
  Expr
} from 'xstate';
import { EventSchema } from '@asus-aics/xhis-schema';

export { EventSchema };

export declare type JSONAction = {
  func: string,
  args: unknown[]
};

export type ChartBaseAction = ActionType | JSONAction;
export type ChartBaseActions =  SingleOrArray<ChartBaseAction>;

/** simple version of invoke config that only allow string type as source */
export interface ChartInvokeConfig<TContext, TEvent extends EventObject> {
  /**
   * The unique identifier for the invoked machine. If not specified, this
   * will be the machine's own `id`, or the URL (from `src`).
   */
  id?: string;
  /**
   * The source of the machine to be invoked, or the machine itself.
   */
  src: string ;
  /**
   * If `true`, events sent to the parent service will be forwarded to the invoked service.
   *
   * Default: `false`
   */
  autoForward?: boolean;
  /**
   * Data from the parent machine's context to set as the (partial or full) context
   * for the invoked child machine.
   *
   * Data should be mapped to match the child machine's context shape.
   */
  data?: Mapper<TContext, TEvent, any> | PropertyMapper<TContext, TEvent, any>;
  /**
   * The transition to take upon the invoked child machine reaching its final top-level state.
   */
  onDone?: string | SingleOrArray<ChartTransitionConfig<TContext, DoneInvokeEvent<any>>>;
  /**
   * The transition to take upon the invoked child machine sending an error event.
   */
  onError?: string | SingleOrArray<ChartTransitionConfig<TContext, DoneInvokeEvent<any>>>;
  /**
   * Meta data related to this invocation
   */
  meta?: MetaObject;
}

export interface ChartTransitionConfig<TContext, TEvent extends EventObject> {
  cond?: Condition<TContext, TEvent>;
  actions?: ChartBaseActions;
  in?: StateValue;
  internal?: boolean;
  target?: TransitionTarget<TContext, TEvent> | undefined;
  meta?: Record<string, any>;
  description?: string;
}

export declare type TransitionConfigOrTarget<TContext, TEvent extends EventObject> = SingleOrArray<TransitionConfigTarget<TContext, TEvent> | ChartTransitionConfig<TContext, TEvent>>;
export declare type TransitionsConfigMap<TContext, TEvent extends EventObject> = {
  [K in TEvent['type']]?: TransitionConfigOrTarget<TContext, TEvent extends {
      type: K;
  } ? TEvent : never>;
} & {
  ''?: TransitionConfigOrTarget<TContext, TEvent>;
} & {
  '*'?: TransitionConfigOrTarget<TContext, TEvent>;
};
declare type TransitionsConfigArray<TContext, TEvent extends EventObject> = Array<(TEvent extends EventObject ? ChartTransitionConfig<TContext, TEvent> & {
  event: TEvent['type'];
} : never) | (ChartTransitionConfig<TContext, TEvent> & {
  event: '';
}) | (ChartTransitionConfig<TContext, TEvent> & {
  event: '*';
})>;

export declare type TransitionsConfig<TContext, TEvent extends EventObject> = TransitionsConfigMap<TContext, TEvent> | TransitionsConfigArray<TContext, TEvent>;

export declare type DelayedTransitions<TContext, TEvent extends EventObject> = Record<string | number, string | SingleOrArray<ChartTransitionConfig<TContext, TEvent>>> | Array<ChartTransitionConfig<TContext, TEvent> & {
  delay: number | string | Expr<TContext, TEvent, number>;
}>;

export declare type StatesConfig<TContext, TStateSchema extends StateSchema, TEvent extends EventObject, TAction extends BaseActionObject = BaseActionObject> = {
  [K in keyof TStateSchema['states']]: ChartStateNodeConfig<TContext, TStateSchema['states'][K], TEvent, TAction>;
};

export interface ChartStateNodeConfig<TContext, TStateSchema extends StateSchema, TEvent extends EventObject, TAction extends BaseActionObject = BaseActionObject> {
  /**
   * The relative key of the state node, which represents its location in the overall state value.
   * This is automatically determined by the configuration shape via the key where it was defined.
   */
  key?: string;
  /**
   * The initial state node key.
   */
  initial?: string | undefined;
  /**
   * The type of this state node:
   *
   *  - `'atomic'` - no child state nodes
   *  - `'compound'` - nested child state nodes (XOR)
   *  - `'parallel'` - orthogonal nested child state nodes (AND)
   *  - `'history'` - history state node
   *  - `'final'` - final state node
   */
  type?: 'atomic' | 'compound' | 'parallel' | 'final' | 'history';
  /**
   * Indicates whether the state node is a history state node, and what
   * type of history:
   * shallow, deep, true (shallow), false (none), undefined (none)
   */
  history?: 'shallow' | 'deep' | boolean | undefined;
  /**
   * The mapping of state node keys to their state node configurations (recursive).
   */
  states?: StatesConfig<TContext, TStateSchema, TEvent, TAction> | undefined;
  /**
   * The services to invoke upon entering this state node. These services will be stopped upon exiting this state node.
   */
  invoke?: SingleOrArray<ChartInvokeConfig<TContext, TEvent>>;
  /**
   * The mapping of event types to their potential transition(s).
   */
  on?: TransitionsConfig<TContext, TEvent>;

  /**
   * The action(s) to be executed upon entering the state node.
   */
  entry?: ChartBaseActions;
  /**
   * The action(s) to be executed upon exiting the state node.
   */
  exit?: ChartBaseActions;
  /**
   * The potential transition(s) to be taken upon reaching a final child state node.
   *
   * This is equivalent to defining a `[done(id)]` transition on this state node's `on` property.
   */
  onDone?: string | SingleOrArray<ChartTransitionConfig<TContext, DoneEventObject>> | undefined;
  /**
   * The mapping (or array) of delays (in milliseconds) to their potential transition(s).
   * The delayed transitions are taken after the specified delay in an interpreter.
   */
  after?: DelayedTransitions<TContext, TEvent>;
  /**
   * An eventless transition that is always taken when this state node is active.
   * Equivalent to a transition specified as an empty `''`' string in the `on` property.
   */
  always?: TransitionConfigOrTarget<TContext, TEvent>;

  strict?: boolean | undefined;
  /**
   * The meta data associated with this state node, which will be returned in State instances.
   */
  meta?: TStateSchema extends {
      meta: infer D;
  } ? D : any;
  /**
   * The data sent with the "done.state._id_" event if this is a final state node.
   *
   * The data will be evaluated with the current `context` and placed on the `.data` property
   * of the event.
   */
  data?: Mapper<TContext, TEvent, any> | PropertyMapper<TContext, TEvent, any>;
  /**
   * The unique ID of the state node, which can be referenced as a transition target via the
   * `#id` syntax.
   */
  id?: string | undefined;
  /**
   * The string delimiter for serializing the path to a string. The default is "."
   */
  delimiter?: string;
  /**
   * The order this state node appears. Corresponds to the implicit SCXML document order.
   */
  order?: number;
  /**
   * The tags for this state node, which are accumulated into the `state.tags` property.
   */
  tags?: SingleOrArray<string>;
  /**
   * Whether actions should be called in order.
   * When `false` (default), `assign(...)` actions are prioritized before other actions.
   *
   * @default false
   */
  preserveActionOrder?: boolean;
  /**
   * A text description of the state node
   */
  description?: string;
}

export interface ChartConfig<TContext, TStateSchema = StateSchema<TContext>, TEvent extends EventObject = EventObject, TAction extends BaseActionObject = BaseActionObject> extends ChartStateNodeConfig<TContext, TStateSchema, TEvent, TAction> {
  /**
   * For each state nodes, the action(s) to be executed upon entering the state node
   */
  eachEntry?: ChartBaseActions;
  /**
   * For each state nodes, the action(s) to be executed upon exiting the state node
   */
  eachExit?: ChartBaseActions;
  /**
    * The initial context (extended state)
    */
  context?: TContext | (() => TContext);
  /**
   * The machine's own version.
   */
  version?: string;
}
