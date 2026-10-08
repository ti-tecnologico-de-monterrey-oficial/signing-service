import { expect } from 'chai'
import issue, {
  getSigningMaterial,
  IssuerInstance,
  clearIssuerInstances
} from './issue.js'
import { TEST_TENANT_NAME } from './config.js'
import { getUnsignedVC } from './test-fixtures/vc.js'

describe('issue', () => {
  beforeEach(() => {
    clearIssuerInstances()
  })

  it('throws a 420 SigningException when the credential has no issuer', async () => {
    const credential = getUnsignedVC()
    delete credential.issuer
    try {
      await issue(credential, TEST_TENANT_NAME, ['ed25519'])
      expect.fail('should have thrown')
    } catch (err) {
      expect(err.code).to.eql(420)
      expect(err.message).to.include('issuer property')
    }
  })

  it('throws a 420 SigningException when the issuer is an array', async () => {
    const credential = getUnsignedVC()
    credential.issuer = ['did:example:123']
    try {
      await issue(credential, TEST_TENANT_NAME, ['ed25519'])
      expect.fail('should have thrown')
    } catch (err) {
      expect(err.code).to.eql(420)
      expect(err.message).to.include('cannot be an Array')
    }
  })

  it('throws a 420 SigningException when the issuer is neither a string nor an object', async () => {
    const credential = getUnsignedVC()
    credential.issuer = 12345
    try {
      await issue(credential, TEST_TENANT_NAME, ['ed25519'])
      expect.fail('should have thrown')
    } catch (err) {
      expect(err.code).to.eql(420)
      expect(err.message).to.include('must be either a string or an object')
    }
  })

  it('replaces a string issuer with the signing DID', async () => {
    const credential = getUnsignedVC()
    credential.issuer = 'did:example:placeholder'
    const signed = await issue(credential, TEST_TENANT_NAME, ['ed25519'])
    expect(signed.issuer).to.include('did:key')
    expect(signed.proof).to.exist
  })

  it('sets the id on an object issuer with the signing DID', async () => {
    const credential = getUnsignedVC()
    const signed = await issue(credential, TEST_TENANT_NAME, ['ed25519'])
    expect(signed.issuer.id).to.include('did:key')
    expect(signed.proof).to.exist
  })

  it('throws a 404 SigningException when the tenant does not exist', async () => {
    const credential = getUnsignedVC()
    try {
      await issue(credential, 'no-such-tenant', ['ed25519'])
      expect.fail('should have thrown')
    } catch (err) {
      expect(err.code).to.eql(404)
      expect(err.message).to.include("Tenant doesn't exist")
    }
  })

  it('applies multiple proofs when multiple suites are requested', async () => {
    const credential = getUnsignedVC()
    const signed = await issue(credential, TEST_TENANT_NAME, [
      'ed25519',
      'eddsa2022'
    ])
    expect(signed.proof).to.be.an('array')
    expect(signed.proof.length).to.eql(2)
  })
})

describe('getSigningMaterial', () => {
  it('builds a did:key document and matching key by default', async () => {
    const { didDocument, key } = await getSigningMaterial({
      method: 'key',
      seed: new Uint8Array(32).fill(1)
    })
    expect(didDocument.id).to.include('did:key')
    expect(key.controller).to.eql(didDocument.id)
  })

  it('builds a did:web document when method is web', async () => {
    const { didDocument, key } = await getSigningMaterial({
      method: 'web',
      seed: new Uint8Array(32).fill(2),
      url: 'https://example.com'
    })
    expect(didDocument.id).to.eql('did:web:example.com')
    expect(key.controller).to.eql(didDocument.id)
  })
})

describe('IssuerInstance', () => {
  it('rethrows errors raised while issuing a credential', async () => {
    const instance = new IssuerInstance({
      documentLoader: () => {},
      signingSuite: {} // incomplete suite causes the underlying vc library to throw
    })
    try {
      await instance.issueCredential({ credential: getUnsignedVC() })
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).to.be.instanceOf(Error)
    }
  })
})
