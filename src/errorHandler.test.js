import { expect } from 'chai'
import errorHandler from './middleware/errorHandler.js'

describe('errorHandler middleware', () => {
  const makeRes = () => {
    const res = {}
    res.header = () => res
    res.status = (code) => {
      res.statusCode = code
      return res
    }
    res.json = (body) => {
      res.body = body
      return res
    }
    return res
  }

  it('uses the error code and message when provided', () => {
    const res = makeRes()
    const error = { code: 404, message: 'tenant not found' }
    errorHandler(error, {}, res, () => {})
    expect(res.statusCode).to.eql(404)
    expect(res.body.code).to.eql(404)
    expect(res.body.message).to.include('tenant not found')
  })

  it('defaults to a 500 code and generic message when none are provided', () => {
    const res = makeRes()
    errorHandler({}, {}, res, () => {})
    expect(res.statusCode).to.eql(500)
    expect(res.body.code).to.eql(500)
    expect(res.body.message).to.include('unknown error')
  })

  it('sets the content-type header to application/json', () => {
    const res = makeRes()
    let headerName, headerValue
    res.header = (name, value) => {
      headerName = name
      headerValue = value
      return res
    }
    errorHandler({ code: 400, message: 'bad' }, {}, res, () => {})
    expect(headerName).to.eql('Content-Type')
    expect(headerValue).to.eql('application/json')
  })
})
