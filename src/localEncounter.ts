import { EncounterContextSchema } from '@asus-aics/xhis-schema';
import { EventObject } from 'xstate';
import { MachineId } from './env';
import { ChartConfig } from './declaration';
import { EncounterStateEngine } from './encounter';

class LocalEncounterStateEngine extends EncounterStateEngine {
  static MachineId = MachineId.LOCAL_ENCOUNTER;
  machineId = MachineId.LOCAL_ENCOUNTER;

  defaultChart(): ChartConfig<EncounterContextSchema, unknown, EventObject> {
    return {
      id: 'localEncounterFlow',
      initial: 'editor',
      context: {},
      meta: {
        soapTemplate: ['subjective', 'objective', 'assessment', 'plan'],
      },
      states: {
        editor: {
          on: {
            RESOLVE: 'finish',
          },
        },
        finish: {
          type: 'final',
        },
      },
    };
  }
}

export { LocalEncounterStateEngine };
