import type { Meta, StoryObj } from '@storybook/vue3'
import { createMockCall } from '@rtcstack/sdk/mock'
import VideoConference from './VideoConference.vue'

const meta: Meta<typeof VideoConference> = {
  title: 'Components/VideoConference',
  component: VideoConference,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof VideoConference>

const twoParticipants = createMockCall({
  participants: [
    { id: 'local', name: 'You', isLocal: true, role: 'host' },
    { id: 'alice', name: 'Alice', role: 'participant' },
  ],
})

const sixParticipants = createMockCall({
  participants: [
    { id: 'local', name: 'You', isLocal: true, role: 'host' },
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Carol' },
    { id: 'p4', name: 'Dan' },
    { id: 'p5', name: 'Eve' },
  ],
})

const connecting = createMockCall({ connectionState: 'connecting' })
const disconnected = createMockCall({ connectionState: 'disconnected' })

export const TwoParticipants: Story = {
  args: { call: twoParticipants as never },
}

export const SixParticipants: Story = {
  args: { call: sixParticipants as never },
}

export const WithChat: Story = {
  args: { call: twoParticipants as never, showChat: true },
}

export const Connecting: Story = {
  args: { call: connecting as never },
}

export const Disconnected: Story = {
  args: { call: disconnected as never },
}
