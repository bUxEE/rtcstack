import { createContext, useContext, type ReactNode } from 'react'
import type { Call } from '@rtcstack/sdk'

const CallContext = createContext<Call | null>(null)

export function CallProvider({ call, children }: { call: Call; children: ReactNode }) {
  return <CallContext.Provider value={call}>{children}</CallContext.Provider>
}

export function useCall(): Call {
  const call = useContext(CallContext)
  if (!call) throw new Error('useCall must be used inside <CallProvider>')
  return call
}
