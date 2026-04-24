import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from './events.js'

type TestEvents = {
  foo: [value: string]
  bar: [a: number, b: number]
}

describe('EventEmitter', () => {
  it('calls registered listener on emit', () => {
    const ee = new EventEmitter<TestEvents>()
    const fn = vi.fn()
    ee.on('foo', fn)
    ee.emit('foo', 'hello')
    expect(fn).toHaveBeenCalledWith('hello')
  })

  it('supports multiple listeners on the same event', () => {
    const ee = new EventEmitter<TestEvents>()
    const a = vi.fn()
    const b = vi.fn()
    ee.on('foo', a)
    ee.on('foo', b)
    ee.emit('foo', 'x')
    expect(a).toHaveBeenCalledOnce()
    expect(b).toHaveBeenCalledOnce()
  })

  it('removes listener with off()', () => {
    const ee = new EventEmitter<TestEvents>()
    const fn = vi.fn()
    ee.on('foo', fn)
    ee.off('foo', fn)
    ee.emit('foo', 'ignored')
    expect(fn).not.toHaveBeenCalled()
  })

  it('once() fires only once', () => {
    const ee = new EventEmitter<TestEvents>()
    const fn = vi.fn()
    ee.once('foo', fn)
    ee.emit('foo', 'first')
    ee.emit('foo', 'second')
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('first')
  })

  it('passes multiple args', () => {
    const ee = new EventEmitter<TestEvents>()
    const fn = vi.fn()
    ee.on('bar', fn)
    ee.emit('bar', 1, 2)
    expect(fn).toHaveBeenCalledWith(1, 2)
  })

  it('removeAllListeners() clears all', () => {
    const ee = new EventEmitter<TestEvents>()
    const fn = vi.fn()
    ee.on('foo', fn)
    ee.on('bar', fn)
    ee.removeAllListeners()
    ee.emit('foo', 'x')
    ee.emit('bar', 1, 2)
    expect(fn).not.toHaveBeenCalled()
  })

  it('removeAllListeners(event) clears only that event', () => {
    const ee = new EventEmitter<TestEvents>()
    const a = vi.fn()
    const b = vi.fn()
    ee.on('foo', a)
    ee.on('bar', b)
    ee.removeAllListeners('foo')
    ee.emit('foo', 'x')
    ee.emit('bar', 1, 2)
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledOnce()
  })
})
