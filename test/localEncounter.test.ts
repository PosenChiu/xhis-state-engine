/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LocalEncounterStateEngine,
  EngineRole,
  EngineConfig
} from '../src/index';
import { EncounterContextSchema } from '@asus-aics/xhis-schema';

describe('test local encounter state engine', () => {
  const config: EngineConfig<EncounterContextSchema> = {
    syncId: 'test-id',
    role: EngineRole.SOURCE,
  };
  const engine = new LocalEncounterStateEngine(config);

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
});
