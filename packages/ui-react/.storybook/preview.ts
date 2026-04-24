import type { Preview } from '@storybook/react'
import '../src/styles.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0f0f1a' },
        { name: 'light', value: '#f8f8fc' },
      ],
    },
    controls: { matchers: { color: /(background|color)$/i, date: /date$/i } },
  },
}

export default preview
