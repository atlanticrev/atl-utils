let requestSequence = 0

export const nextRequestId = (): string => {
  requestSequence += 1
  return `req_${Date.now()}_${requestSequence}`
}
