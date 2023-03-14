/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChartConfig } from '../../declaration';
import {
  ActionEvent,
  PresetKey,
  Timing
} from '../../env';
import { EncounterContextSchema } from '@asus-aics/xhis-schema';
import { EventObject } from 'xstate';

export function getChart(): ChartConfig<EncounterContextSchema, any, EventObject> {
  return {
    id: 'encounterFlow',
    initial: 'editor',
    context: {},
    meta: {
      soapTemplate: ['subjective', 'objective'],
    },
    states: {
      editor: {
        initial: 'idle',
        type: 'parallel',
        entry: [
          {
            func: 'assignActionEvent',
            args: [
              ActionEvent.FETCH_DATA,
              {
                contextKeys: ['patientId'],
                api: 'patientContext',
                data: {},
                applyContextPath: ['patientContext'],
                timing: Timing.Always,
              }
            ],
          },
          {
            func: 'assignActionEvent',
            args: [
              ActionEvent.FETCH_DATA,
              {
                contextKeys: ['patientId'],
                presetKeys: [PresetKey.USER_ID],
                api: 'patientMemo',
                data: {},
                applyContextPath: ['memo', 'private', PresetKey.USER_ID],
                timing: Timing.Always,
              }
            ],
          }
        ],
        states: {
          soapEditor: {
            initial: 'init',
            states: {
              init: {
                on: {
                  UPDATE_SOAP: { internal: true, actions: ['assignContext'] },
                },
              },
            },
            tags: ['editor'],
          },
          icdEditor: {
            initial: 'init',
            states: {
              init: {
                on: {
                  UPDATE_ICD: { internal: true, actions: ['assignContext'] },
                },
              },
            },
            tags: ['editor'],
          },
          orderEditor: {
            initial: 'init',
            states: {
              init: {
                on: {
                  UPDATE_ORDER: { internal: true, actions: ['assignContext'] },
                },
              },
            },
            tags: ['editor'],
          },
          drugEditor: {
            initial: 'init',
            states: {
              init: {
                on: {
                  UPDATE_DRUG: { internal: true, actions: ['assignContext'] },
                },
              },
            },
            tags: ['editor'],
          },
          vitalSignEditor: {
            initial: 'init',
            states: {
              init: {
                on: {
                  UPDATE_VITAL_SIGN: { internal: true, actions: ['assignContext'] },
                },
              },
            },
          },
          idForm: {
            initial: 'init',
            states: {
              init: {
                on: {
                  UPDATE_ID_FORM: { internal: true, actions: ['assignContext'] },
                },
              },
            },
            tags: ['editor'],
          },
          memoPersonEditor: {
            initial: 'init',
            states: {
              init: {
                on: {
                  UPDATE_MEMO_PERSON: { internal: true, actions: ['assignContext'] },
                },
              },
            },
            tags: ['editor'],
          },
          memoGlobalEditor: {
            initial: 'init',
            states: {
              init: {
                on: {
                  UPDATE_MEMO_GLOBAL: { internal: true, actions: ['assignContext'] },
                },
              },
            },
            tags: ['editor'],
          },
        },
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