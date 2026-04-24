import type { Meta, StoryObj } from '@storybook/react'
import { createMockCall } from '@rtcstack/sdk/mock'
import { CallProvider } from '../context'
import { ChatPanel } from './ChatPanel'

const meta: Meta<typeof ChatPanel> = {
  title: 'Components/ChatPanel',
  component: ChatPanel,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof ChatPanel>

function withMessages() {
  const call = createMockCall({
    participants: [{ id: 'local', name: 'You', isLocal: true }],
  })
  call._mock.sendMessage('alice', 'Hey everyone!')
  call._mock.sendMessage('bob', "What's up!")
  call._mock.sendMessage('local', 'Hello from me')
  return call
}

export const Empty: Story = {
  decorators: [
    (Story) => {
      const call = createMockCall({
        participants: [{ id: 'local', name: 'You', isLocal: true }],
      })
      return (
        <CallProvider call={call as never}>
          <div style={{ width: 320, height: 500, display: 'flex' }}>
            <Story />
          </div>
        </CallProvider>
      )
    },
  ],
}

export const WithMessages: Story = {
  decorators: [
    (Story) => {
      const call = withMessages()
      return (
        <CallProvider call={call as never}>
          <div style={{ width: 320, height: 500, display: 'flex' }}>
            <Story />
          </div>
        </CallProvider>
      )
    },
  ],
}
