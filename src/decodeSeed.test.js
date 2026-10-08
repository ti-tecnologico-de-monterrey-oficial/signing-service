import { expect } from 'chai'
import decodeSeed from './utils/decodeSeed.js'

describe('decodeSeed', () => {
  it('decodes a multibase-encoded seed into 32 bytes', async () => {
    const seed = await decodeSeed(
      'z1AeiPT496wWmo9BG2QYXeTusgFSZPNG3T9wNeTtjrQ3rCB'
    )
    expect(seed).to.be.instanceOf(Uint8Array)
    expect(seed.length).to.eql(32)
  })

  it('truncates a raw string seed of 32 or more characters to 32 bytes', async () => {
    const raw = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ'
    const seed = await decodeSeed(raw)
    expect(seed).to.be.instanceOf(Uint8Array)
    expect(seed.length).to.eql(32)
  })

  it('accepts a raw string seed of exactly 32 characters', async () => {
    const raw = 'a'.repeat(32)
    const seed = await decodeSeed(raw)
    expect(seed.length).to.eql(32)
  })

  it('throws a TypeError when the seed is shorter than 32 bytes and not multibase', async () => {
    try {
      await decodeSeed('tooShort')
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).to.be.instanceOf(TypeError)
      expect(err.message).to.include('must be at least 32 bytes')
    }
  })

  it('throws a TypeError for an empty string seed', async () => {
    try {
      await decodeSeed('')
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).to.be.instanceOf(TypeError)
    }
  })
})
