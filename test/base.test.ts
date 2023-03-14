/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BaseStateEngine,
  EngineRole,
  StateEvent,
  EngineConfig,
  MachineId
} from '../src/index';
import { BaseContextSchema } from '@asus-aics/xhis-schema';

describe('test base state engine', () => {
  const config: EngineConfig<BaseContextSchema> = {
    syncId: 'test-id',
    role: EngineRole.SOURCE,
  };
  const engine = new BaseStateEngine(config);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('test instance and properties', () => {
    expect(engine).toBeDefined();
    expect(engine).toEqual(
      expect.objectContaining({
        config: expect.any(Object),
        machine: expect.any(Object),
      })
    );
  });

  it('test transitionState', () => {
    try {
      engine.transitionState({
        type: StateEvent.RESOLVE,
        machineId: engine.machineId,
      });
    } catch (err: any) {
      expect(err.toString()).toContain('assertion actions error');
    }
  });

  it('test getMonitorParams', () => {
    expect(engine.getMonitorParams()).toStrictEqual([]);
  });

  it('test setMachineConfig', () => {
    engine.setMachineConfig({
      actions: {
        assertion: () => { console.log('No Error');},
      },
    });

    engine.state = engine.machine.initialState;

    engine.transitionState({
      type: StateEvent.RESOLVE,
      machineId: engine.machineId,
    });
  });

  it('test assignContext', () => {
    engine.role = EngineRole.SOURCE_AND_SINK;
    engine.state = engine.machine.initialState;
    engine.sendTransitionEvent({
      type: StateEvent.SELF,
      context: {
        action: {
          events: [{ name: 'test', data: { value: 'abc' } }],
        },
      },
    });

    expect(engine.state.context).toMatchObject({
      action: {
        events: [{ name: 'test', data: { value: 'abc' } }],
      },
    });

    engine.sendTransitionEvent({
      type: StateEvent.SELF,
      context: {
        action: undefined,
      },
    });

    expect(engine.state.context).toMatchObject({
      action: undefined,
    });
  });

  it('test ensureSyncId', () => {
    let id = BaseStateEngine.ensureSyncId({
      type: 'fake-type',
    });

    expect(id.startsWith(MachineId.BASE)).toBeTruthy();

    id = BaseStateEngine.ensureSyncId({
      type: 'fake-type',
      syncId: 'fake-sync',
      forceSyncId: true,
    });

    expect(id).toStrictEqual('fake-sync');
  });
});
