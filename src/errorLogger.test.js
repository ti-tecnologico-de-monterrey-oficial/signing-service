import { expect } from 'chai'
import errorLogger from './middleware/errorLogger.js'
import logger from './utils/logger.js'

describe('errorLogger middleware', () => {
  let originalError

  beforeEach(() => {
    originalError = logger.error
  })

  afterEach(() => {
    logger.error = originalError
  })

  it('logs the error details and calls next with the error', () => {
    let loggedMessage, loggedMeta
    logger.error = (message, meta) => {
      loggedMessage = message
      loggedMeta = meta
    }
    const error = new Error('boom')
    const req = { originalUrl: '/foo', method: 'GET', ip: '127.0.0.1' }
    let nextError
    errorLogger(error, req, {}, (e) => {
      nextError = e
    })
    expect(nextError).to.eql(error)
    expect(loggedMessage).to.include('/foo')
    expect(loggedMessage).to.include('GET')
    expect(loggedMessage).to.include('boom')
    expect(loggedMeta.stackTrace).to.exist
  })

  it('handles errors without a message or stack', () => {
    let loggedMessage, loggedMeta
    logger.error = (message, meta) => {
      loggedMessage = message
      loggedMeta = meta
    }
    const req = { originalUrl: '/bar', method: 'POST', ip: '127.0.0.1' }
    errorLogger({}, req, {}, () => {})
    expect(loggedMessage).to.include('unknown error')
    expect(loggedMeta.stackTrace).to.eql('no stack trace available')
  })
})
