import { expect } from 'chai'
import SigningException from './SigningException.js'

describe('SigningException', () => {
  it('sets code, message and stack when all are provided', () => {
    const err = new SigningException(400, 'bad request', 'stack-trace')
    expect(err.code).to.eql(400)
    expect(err.message).to.eql('bad request')
    expect(err.stack).to.eql('stack-trace')
  })

  it('leaves stack undefined when not provided', () => {
    const err = new SigningException(500, 'server error')
    expect(err.code).to.eql(500)
    expect(err.message).to.eql('server error')
    expect(err.stack).to.be.undefined
  })

  it('is a plain constructable object, not an Error instance', () => {
    const err = new SigningException(404, 'not found')
    expect(err).to.not.be.instanceOf(Error)
    expect(err.code).to.eql(404)
  })
})
