import { expect } from 'chai'
import logger from './utils/logger.js'

describe('logger', () => {
  it('exposes the custom npm-style logging levels', () => {
    expect(logger.levels).to.include({
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5,
      silly: 6
    })
  })

  it('has a configured level string', () => {
    expect(logger.level).to.be.a('string')
    expect(logger.level).to.not.be.empty
  })

  it('logs without throwing at various levels', () => {
    expect(() => logger.info('test info message')).to.not.throw()
    expect(() => logger.error('test error message')).to.not.throw()
    expect(() => logger.warn('test warn message')).to.not.throw()
    expect(() => logger.http('test http message')).to.not.throw()
  })
})
