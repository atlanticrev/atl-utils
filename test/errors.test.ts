import { describe, expect, it } from 'vitest'

import {
  AppError,
  AppTypeError,
  HttpNetworkError,
  createError,
  createSerializationError,
  hasErrorCode,
  serializeError,
  toError,
} from '../src/index.js'

describe('errors module', () => {
  it('creates typed app errors with metadata', () => {
    const cause = new Error('root cause')
    const error = createError('Boom', {
      code: 'BOOM',
      cause,
      context: {
        feature: 'test',
      },
    })

    expect(error).toBeInstanceOf(AppError)
    expect(error.message).toBe('Boom')
    expect(error.code).toBe('BOOM')
    expect(error.cause).toBe(cause)
    expect(error.context).toEqual({ feature: 'test' })
  })

  it('creates serialization errors as TypeError-compatible errors', () => {
    const error = createSerializationError('Cannot serialize')

    expect(error).toBeInstanceOf(AppTypeError)
    expect(error).toBeInstanceOf(TypeError)
    expect(error.code).toBe('SERIALIZATION_ERROR')
  })

  it('normalizes unknown values to Error', () => {
    const fromString = toError('failure')
    const fromObject = toError({ name: 'CustomError', message: 'bad', code: 'BAD' })

    expect(fromString).toBeInstanceOf(Error)
    expect(fromString.message).toBe('failure')

    expect(fromObject.name).toBe('CustomError')
    expect(fromObject.message).toBe('bad')
    expect(hasErrorCode(fromObject, 'BAD')).toBe(true)
  })

  it('serializes error chains and handles circular causes', () => {
    const child = createError('child', { code: 'CHILD' })
    const parent = createError('parent', { code: 'PARENT', cause: child })
    ;(child as AppError & { cause?: unknown }).cause = parent

    const serialized = serializeError(parent, {
      includeStack: false,
      maxCauseDepth: 4,
    })

    expect(serialized.code).toBe('PARENT')
    expect(serialized.cause).toMatchObject({
      code: 'CHILD',
      cause: '[Circular]',
    })
  })

  it('http client errors inherit from AppError', () => {
    const error = new HttpNetworkError('Network down')

    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('NETWORK_ERROR')
  })
})
