import { expect } from 'chai'
import accessLogger from './middleware/accessLogger.js'

describe('accessLogger middleware', () => {
  it('returns an express-compatible middleware function', () => {
    const middleware = accessLogger()
    expect(middleware).to.be.a('function')
    // morgan middleware functions accept (req, res, next)
    expect(middleware.length).to.eql(3)
  })
})
