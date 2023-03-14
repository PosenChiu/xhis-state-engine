/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChartConfig } from '../../declaration';
import { EncounterContextSchema } from '@asus-aics/xhis-schema';
import { EventObject } from 'xstate';

export function getChart(): ChartConfig<EncounterContextSchema, any, EventObject> {
  return {
    id: 'localEncounterFlow',
    initial: 'editor',
    context: {},
    meta: {
      soapTemplate: ['subjective', 'objective'],
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