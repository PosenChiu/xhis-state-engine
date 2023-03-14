import { BaseStateEngine } from './base';
import { OpdStateEngine } from './opd';
import { EncounterStateEngine } from './encounter';
import { MachineId } from './env';
import { LocalEncounterStateEngine } from './localEncounter';

export * from '@asus-aics/xhis-schema';
export * from './env';
export * from './base';
export * from './opd';
export * from './encounter';
export * from './localEncounter';
export * from './charts';

export const EngineMap = new Map<MachineId, typeof BaseStateEngine>([
  [BaseStateEngine.MachineId, BaseStateEngine],
  [EncounterStateEngine.MachineId, EncounterStateEngine],
  [OpdStateEngine.MachineId, OpdStateEngine],
  [LocalEncounterStateEngine.MachineId, LocalEncounterStateEngine]
]);
