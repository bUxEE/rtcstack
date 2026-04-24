export { Call } from './call.js'
export { EventEmitter } from './events.js'
export type {
  CallOptions,
  CallEventMap,
  ConnectionState,
  Participant,
  ParticipantRole,
  Message,
  TranscriptSegment,
  DeviceList,
  Layout,
  ConnectionQuality,
} from './types.js'

import { Call } from './call.js'
import type { CallOptions } from './types.js'

export function createCall(options: CallOptions): Call {
  return new Call(options)
}
