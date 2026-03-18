import {
  isBlobLike,
  isFormDataLike,
  isPlainObject,
  isUrlSearchParamsLike,
  normalizeScalarValue,
} from './guards.js'
import { appendQueryParam } from './query.js'

export const appendFormDataValue = (formData: FormData, key: string, value: unknown): void => {
  if (value === undefined) {
    return
  }

  if (value === null) {
    formData.append(key, '')
    return
  }

  if (isBlobLike(value)) {
    formData.append(key, value)
    return
  }

  if (value instanceof Date) {
    formData.append(key, value.toISOString())
    return
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      appendFormDataValue(formData, `${key}[]`, entry)
    }
    return
  }

  if (isPlainObject(value)) {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      appendFormDataValue(formData, `${key}[${nestedKey}]`, nestedValue)
    }
    return
  }

  formData.append(key, normalizeScalarValue(value))
}

export const createFormData = (value: FormData | Record<string, unknown>): FormData => {
  if (isFormDataLike(value)) {
    return value
  }

  const formData = new FormData()

  for (const [key, entry] of Object.entries(value)) {
    appendFormDataValue(formData, key, entry)
  }

  return formData
}

export const createUrlEncodedBody = (
  value: URLSearchParams | Record<string, unknown>,
): URLSearchParams => {
  if (isUrlSearchParamsLike(value)) {
    return value
  }

  const searchParams = new URLSearchParams()

  for (const [key, entry] of Object.entries(value)) {
    appendQueryParam(searchParams, key, entry)
  }

  return searchParams
}
