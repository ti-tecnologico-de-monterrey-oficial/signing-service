import { expect } from 'chai'
import generateSeed from './generate.js'

describe('generateSeed', () => {
  it('generates a did:key by default', async () => {
    const result = await generateSeed({})
    expect(result.seed).to.be.a('string')
    expect(result.decodedSeed).to.be.instanceOf(Uint8Array)
    expect(result.decodedSeed.length).to.eql(32)
    expect(result.did).to.include('did:key')
    expect(result.didDocument.id).to.eql(result.did)
  })

  it('generates a different did:key seed on each call', async () => {
    const first = await generateSeed({})
    const second = await generateSeed({})
    expect(first.seed).to.not.eql(second.seed)
    expect(first.did).to.not.eql(second.did)
  })

  it('generates a did:web when a url is provided', async () => {
    const result = await generateSeed({
      url: 'https://raw.githubusercontent.com/jchartrand/didWebTest/main'
    })
    expect(result.did).to.eql(
      'did:web:raw.githubusercontent.com:jchartrand:didWebTest:main'
    )
    expect(result.didDocument.id).to.eql(result.did)
  })
})
