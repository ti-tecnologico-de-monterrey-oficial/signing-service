import { expect } from 'chai'
import invalidPathHandler from './middleware/invalidPathHandler.js'

describe('invalidPathHandler middleware', () => {
  const makeRes = () => {
    const res = {}
    res.status = (code) => {
      res.statusCode = code
      return res
    }
    res.send = (body) => {
      res.body = body
      return res
    }
    return res
  }

  it('returns a 404 with the requested route in the message', () => {
    const res = makeRes()
    const req = { originalUrl: '/nope', method: 'GET', ip: '127.0.0.1' }
    invalidPathHandler(req, res)
    expect(res.statusCode).to.eql(404)
    expect(res.body.code).to.eql(404)
    expect(res.body.message).to.include('/nope')
  })
})
