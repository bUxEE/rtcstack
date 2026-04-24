import type { Meta, StoryObj } from '@storybook/react'
import { action } from '@storybook/addon-actions'
import { createMockCall } from '@rtcstack/sdk/mock'
import { CallProvider } from '../context'
import { ControlBar } from './ControlBar'

const meta: Meta<typeof ControlBar> = {
  title: 'Components/ControlBar',
  component: ControlBar,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      const call = createMockCall({
        participants: [{ id: 'local', name: 'You', isLocal: true }],
      })
      return (
        <CallProvider call={call as never}>
          <Story />
        </CallProvider>
      )
    },
  ],
}
export default meta

type Story = StoryObj<typeof ControlBar>

export const Default: Story = {
  args: { onLeave: action('leave') },
}

export const MicMuted: Story = {
  decorators: [
    (Story) => {
      const call = createMockCall({
        participants: [{ id: 'local', name: 'You', isLocal: true, isMuted: true }],
      })
      return (
        <CallProvider call={call as never}>
          <Story />
        </CallProvider>
      )
    },
  ],
  args: { onLeave: action('leave') },
}

export const CameraOff: Story = {
  decorators: [
    (Story) => {
      const call = createMockCall({
        participants: [{ id: 'local', name: 'You', isLocal: true, isCameraOff: true }],
      })
      return (
        <CallProvider call={call as never}>
          <Story />
        </CallProvider>
      )
    },
  ],
  args: { onLeave: action('leave') },
}
