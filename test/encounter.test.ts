/* eslint-disable @typescript-eslint/no-explicit-any */
import { State } from 'xstate';
import {
  MachineId,
  ActionEvent,
  EncounterStateEngine,
  EngineRole,
  EngineEvent,
  StateEvent,
  SyncEvent,
  EngineConfig,
  charts
} from '../src/index';
import { EncounterContextSchema } from '@asus-aics/xhis-schema';

describe('test encounter state engine', () => {
  const config: EngineConfig<EncounterContextSchema> = {
    syncId: 'test-id',
    role: EngineRole.SOURCE,
  };
  const engine = new EncounterStateEngine(config);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('test instance and properties', () => {
    expect(engine).toBeDefined();
    expect(engine).toEqual(
      expect.objectContaining({
        config: expect.any(Object),
        state: expect.any(Object),
        machine: expect.any(Object),
      })
    );
  });

  it('test assignActionEvent', () => {
    const result = engine.assignActionEvent('testEvent', 'login');

    expect(result).toStrictEqual({ type: 'xstate.assign', assignment: { action: expect.any(Function) } });

    const action = (result.assignment as any).action;
    const result2 = action({}, { type: 'test' }, {});

    expect(result2).toStrictEqual({ events: [{ name: 'testEvent', data: { value: 'login' } }] });
  });

  it('test clearActionEvents', () => {
    const result = engine.clearActionEvents();
    const fakeEvents = [{ name: 'test1', data: 123 }];

    expect(result).toStrictEqual({ type: 'xstate.assign', assignment: { action: expect.any(Function) } });

    const action = (result.assignment as any).action;
    const result2 = action({
      action: {
        events: fakeEvents,
      },
    });

    expect(result2).toStrictEqual({ events: [] });
  });

  it('test clearContext', () => {
    const result = engine.clearContext();
    const fakeCtx = { a: 1, b: 2 };

    expect(result).toStrictEqual({ type: 'xstate.assign', assignment: expect.any(Function) });

    const action = (result as any).assignment;
    const result2 = action(fakeCtx);

    expect(result2).toStrictEqual({ a: undefined, b: undefined });
  });

  it('test registerEventListener', () => {
    const spyOn = jest.spyOn(engine, 'on');

    engine.registerEventListener();
    expect(spyOn).toBeCalledWith(EngineEvent.SELF_SYNC, expect.any(Function));
    expect(spyOn).toHaveBeenCalledWith(EngineEvent.SELF_ACK, expect.any(Function));
    expect(spyOn).toHaveBeenCalledWith(ActionEvent.CHANGE_ROLE, expect.any(Function));
  });

  it('test handleEngineAck', () => {
    const fakeState = State.from({}, {});
    const spyAction = jest.spyOn(engine, 'emitAction');

    engine.role = EngineRole.SINK;
    engine.handleEngineAck(fakeState, { type: StateEvent.RESOLVE });

    expect(spyAction).toBeCalledWith(expect.anything());
  });

  it('test handleAction', async () => {
    const fakeState = Object.assign({}, engine.machine.initialState);
    const fakeEvent: SyncEvent = { type: StateEvent.RESOLVE };
    const spyEmit = jest.spyOn(engine, 'emitAsync');

    engine.state = fakeState;
    delete fakeState.context.action;
    await engine.emitAction(fakeEvent);
    expect(spyEmit).not.toBeCalled();

    fakeState.context.action = {
      events: [
        { name: 'ev1', data: {} },
        { name: 'ev2', data: {} }
      ],
    };
    await engine.emitAction(fakeEvent);
    expect(spyEmit).toBeCalledTimes(2);
  });

  it('test getContext', () => {
    expect(engine.getContext()).toStrictEqual(engine.state.context);
  });

  it('test getEncounterId', () => {
    expect(engine.getEncounterId()).toStrictEqual(engine.state.context.encounterId);
  });

  it('test default getMachineId', () => {
    const defaultEngine = new EncounterStateEngine();
    expect(defaultEngine.getMachineId()).toStrictEqual('encounter');

    defaultEngine.machineId = MachineId.IPD;
    expect(defaultEngine.getMachineId()).toStrictEqual('ipd');

    expect(defaultEngine.getSyncState()).toStrictEqual('editor');
  });

  it('test handleEngineSync', async () => {
    const spyTrans = jest.spyOn(engine, 'transitionState').mockImplementation();
    const sendEvent: SyncEvent = {
      machineId: MachineId.ENCOUNTER,
      syncState: engine.getSyncState(),
      type: 'RESOLVE',
      context: {},
    };

    engine.role = EngineRole.SOURCE_AND_SINK;

    await engine.handleEngineSync(sendEvent);
    expect(spyTrans).toBeCalled();
  });

  it('test machine', () => {
    engine.config.role = EngineRole.SOURCE;
    engine.role = EngineRole.SOURCE_AND_SINK;
    engine.state = engine.machine.initialState;

    expect((engine.state.value as any).editor).toStrictEqual({
      soapEditor: 'init',
      icdEditor: 'init',
      orderEditor: 'init',
      drugEditor: 'init',
      vitalSignEditor: 'init',
      idForm: 'init',
      memoPersonEditor: 'init',
      memoGlobalEditor: 'init',
    });

    engine.transitionState({
      machineId: engine.machineId,
      type: StateEvent.RESOLVE,
    });

    expect(engine.state.value).toStrictEqual('finish');
  });

  it('test createSyncId', () => {
    let id = engine.createSyncId({
      type: 'fake-type',
      data: {
        stateJSON: {
          context: {
            encounterId: 'fake-id',
          },
        },
      },
    });

    expect(id).toStrictEqual('encounter-fake-id');

    id = engine.createSyncId({
      type: 'fake-type',
      syncId: 'fake-sync',
      forceSyncId: true,
    });

    expect(id).toStrictEqual('fake-sync');
  });

  it('test fillStore', () => {
    const fakeStore = {};

    engine.fillStore(fakeStore);

    expect(fakeStore).toStrictEqual({
      'action': { 'events': [] },
      'allergyIntolerance': [],
      'customDefined': {},
      'drugList': [],
      'encounterHistory': [],
      'icCard': {
        'writeMeta': {},
      },
      'icdList': [],
      'memo': {
        'private': {},
      },
      'idForm': {},
      'catastrophicIllness': [],
      'orderList': [],
      'patientContext': {
        'action': {
          'events': [],
        },
        'catastrophicIllness': [],
        'memo': {
          'private': {},
        },
        'vipRelations': [],
        'vipTypeOptions': [],
      },
      'remarks': [],
      'reports': [],
      'soap': {
        'assessmentJson': [],
        'objectiveJson': [],
        'planJson': [],
        'subjectiveJson': [],
      },
      'vitalSigns': [],
      'globalError':  {
        'drugList': [],
        'orderList': [],
        'icdList': [],
        'soap': [],
        'vitalSigns': [],
        'allergyIntolerance': [],
      },
    });
  });

  it('test box keys', () => {
    expect(engine.getBoxKeys()).toStrictEqual(['icdList']);
  });

  it('test getMonitorParams', () => {
    expect(engine.getMonitorParams().length).toBeGreaterThan(1);
  });

  it('test getSoapTemplate with chart manager', () => {
    const config: EngineConfig<EncounterContextSchema> = {
      syncId: 'test-lite-id',
      role: EngineRole.SOURCE,
      chart: charts.xhislite.getEncounterChart(),
    };
    const engine = new EncounterStateEngine(config);

    expect(engine.getSoapTemplate()).toMatchObject(
      {
        'type': 'aicsdoc',
        'content': [{
          'type': 'aicstemplate',
          'attrs': {
            'key': 'S',
            'name': 'subjective',
          },
          'content': [{
            'type': 'paragraph',
          }],
        }, {
          'type': 'aicstemplate',
          'attrs': {
            'key': 'O',
            'name': 'objective',
          },
          'content': [{
            'type': 'paragraph',
          }],
        }],
      }
    );
  });
});
