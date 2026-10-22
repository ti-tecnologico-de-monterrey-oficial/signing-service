import { driver } from '@digitalbazaar/did-method-key'
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020'
import {
  afterAll as after,
  afterEach,
  beforeAll as before,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest'
import decodeSeed from './utils/decodeSeed.js'
import request from 'supertest'
import axios from 'axios'
import { clearIssuerInstances } from './issue.js'
import {
  resetConfig,
  deleteSeed,
  TEST_TENANT_NAME,
  getTenantSeed
} from './config.js'
import {
  ed25519_2020suiteContext,
  getCredentialStatus,
  getCredentialStatusBitString,
  getUnsignedVC,
  getUnsignedVCWithStatus,
  getUnsignedVC2WithStatus,
  getUnsignedVCWithoutSuiteContext
} from './test-fixtures/vc.js'

import { build } from './app.js'
import errorHandler from './middleware/errorHandler.js'
import errorLogger from './middleware/errorLogger.js'

const didKeyDriver = driver()
didKeyDriver.use({
  multibaseMultikeyHeader: 'z6Mk',
  fromMultibase: Ed25519VerificationKey2020.from
})

let testDIDSeed
let didDocument
let verificationMethod
let signingDID
let app

describe('api', () => {
  before(async () => {
    testDIDSeed = await decodeSeed(process.env.TENANT_SEED_TESTING)
    const verificationKeyPair = await Ed25519VerificationKey2020.generate({
      seed: testDIDSeed
    })
    ;({ didDocument } = await didKeyDriver.fromKeyPair({ verificationKeyPair }))
    verificationMethod = didKeyDriver.publicMethodFor({
      didDocument,
      purpose: 'assertionMethod'
    }).id
    signingDID = didDocument.id
  })

  after(() => {})

  beforeEach(async () => {
    app = await build()
  })

  afterEach(async () => {})

  describe('GET /', () => {
    it('GET / => hello', async () => {
      await request(app)
        .get('/')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(/\{"message":"signing-service server status: ok\."\}/)
    })
  })

  describe('GET /unknown', () => {
    it('unknown endpoint returns 404', async () => {
      await request(app).get('/unknown').expect(404)
    })
  })

  describe('POST /instance/:instanceId/credentials/sign', () => {
    it('returns 400 if no body', async () => {
      await request(app)
        .post('/instance/testing/credentials/sign')
        .expect('Content-Type', /json/)
        .expect(400)
    })

    it('returns 400 if the credential body is empty', async () => {
      const response = await request(app)
        .post('/instance/testing/credentials/sign')
        .send({})

      expect(response.status).to.eql(400)
      expect(response.body.message).to.contain(
        'A verifiable credential must be provided'
      )
    })

    it('returns 400 for an unsupported signing suite', async () => {
      const response = await request(app)
        .post('/instance/testing/credentials/sign?suite=unsupported')
        .send(getUnsignedVC())

      expect(response.status).to.eql(400)
      expect(response.body.message).to.contain(
        'An invalid signing suite was specified.'
      )
    })

    it('returns 420 if the issuer is missing', async () => {
      const credential = getUnsignedVC()
      delete credential.issuer
      const response = await request(app)
        .post('/instance/testing/credentials/sign')
        .send(credential)

      expect(response.status).to.eql(420)
      expect(response.body.message).to.contain('issuer property')
    })

    it('returns 420 if the issuer is an array', async () => {
      const credential = getUnsignedVC()
      credential.issuer = []
      const response = await request(app)
        .post('/instance/testing/credentials/sign')
        .send(credential)

      expect(response.status).to.eql(420)
      expect(response.body.message).to.contain('cannot be an Array')
    })

    it('returns 420 if the issuer is neither a string nor an object', async () => {
      const credential = getUnsignedVC()
      credential.issuer = 42
      const response = await request(app)
        .post('/instance/testing/credentials/sign')
        .send(credential)

      expect(response.status).to.eql(420)
      expect(response.body.message).to.contain(
        'must be either a string or an object'
      )
    })

    it('replaces a string issuer with the signing DID', async () => {
      const credential = getUnsignedVC()
      credential.issuer = 'did:example:issuer'
      const response = await request(app)
        .post('/instance/testing/credentials/sign')
        .send(credential)

      expect(response.status).to.eql(200)
      expect(response.body.issuer).to.eql(signingDID)
    })

    it('returns 404 if no seed for tenant name', async () => {
      const unSignedVC = getUnsignedVC()
      const response = await request(app)
        .post('/instance/wrongTenantName/credentials/sign')
        .send(unSignedVC)

      expect(response.header['content-type']).to.have.string('json')
      expect(response.status).to.eql(404)
    })

    it('returns the submitted vc version 2, signed with test key', async () => {
      const sentCred = getUnsignedVC2WithStatus()
      const response = await request(app)
        .post('/instance/testing/credentials/sign')
        .send(sentCred)

      expect(response.header['content-type']).to.have.string('json')
      expect(response.status).to.eql(200)

      const returnedCred = JSON.parse(JSON.stringify(response.body))
      const proof = returnedCred.proof
      delete returnedCred.proof
      sentCred.issuer.id = signingDID
      expect(sentCred).to.eql(returnedCred)
      expect(proof.type).to.eql('Ed25519Signature2020')
      expect(proof.verificationMethod).to.eql(verificationMethod)
    })

    it('returns the submitted vc, signed with test key', async () => {
      const sentCred = getUnsignedVCWithStatus()
      const response = await request(app)
        .post('/instance/testing/credentials/sign')
        .send(sentCred)

      expect(response.header['content-type']).to.have.string('json')
      expect(response.status).to.eql(200)

      const returnedCred = JSON.parse(JSON.stringify(response.body))
      const proof = returnedCred.proof
      delete returnedCred.proof
      sentCred.issuer.id = signingDID
      expect(sentCred).to.eql(returnedCred)
      expect(proof.type).to.eql('Ed25519Signature2020')
      expect(proof.verificationMethod).to.eql(verificationMethod)
    })

    it('sets the issuer.id to signing DID', async () => {
      await request(app)
        .post('/instance/testing/credentials/sign')
        .send(getUnsignedVCWithStatus())
        .expect('Content-Type', /json/)
        .expect((res) => expect(res.body.issuer.id).to.eql(signingDID))
        .expect(200)
    })

    it('adds the suite context', async () => {
      const response = await request(app)
        .post('/instance/testing/credentials/sign')
        .send(getUnsignedVCWithoutSuiteContext())

      expect(response.header['content-type']).to.have.string('json')
      expect(response.status).to.eql(200)

      expect(response.body['@context']).to.include(ed25519_2020suiteContext)
    })

    it('leaves an existing credential status as-is', async () => {
      const statusBeforeSigning = getCredentialStatus()
      const response = await request(app)
        .post('/instance/testing/credentials/sign')
        .send(getUnsignedVCWithStatus())

      expect(response.header['content-type']).to.have.string('json')
      expect(response.status).to.eql(200)
      expect(response.body.credentialStatus).to.eql(statusBeforeSigning)
    })

    it('leaves an existing bitstring credential status as-is with v2', async () => {
      const statusBeforeSigning = getCredentialStatusBitString()
      const response = await request(app)
        .post('/instance/testing/credentials/sign')
        .send(getUnsignedVC2WithStatus())

      expect(response.header['content-type']).to.have.string('json')
      expect(response.status).to.eql(200)
      expect(response.body.credentialStatus).to.eql(statusBeforeSigning)
    })
  })

  describe('DID:web', () => {
    const tenantName = 'apptest'

    before(() => {
      resetConfig()
      process.env[`TENANT_SEED_${tenantName}`] =
        'z1AeiPT496wWmo9BG2QYXeTusgFSZPNG3T9wNeTtjrQ3rCB'
      process.env[`TENANT_DIDMETHOD_${tenantName}`] = 'web'
      process.env[`TENANT_DID_URL_${tenantName}`] = 'https://example.com'
    })

    after(() => {
      delete process.env[`TENANT_SEED_${tenantName}`]
      delete process.env[`TENANT_DIDMETHOD_${tenantName}`]
      delete process.env[`TENANT_DID_URL_${tenantName}`]
    })

    it('signs with a did:web', async () => {
      await request(app)
        .post(`/instance/${tenantName}/credentials/sign`)
        .send(getUnsignedVCWithStatus())
        .expect('Content-Type', /json/)
        .expect((res) =>
          expect(res.body.issuer.id).to.eql('did:web:example.com')
        )
        .expect(200)
    })

    it('adds eddsa proof on demand', async () => {
      await request(app)
        .post(`/instance/${tenantName}/credentials/sign?suite=eddsa2022`)
        .send(getUnsignedVCWithStatus())
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.issuer.id).to.eql('did:web:example.com')
          expect(res.body.proof.cryptosuite).to.eql('eddsa-rdfc-2022')
          expect(res.body.proof.type).to.eql('DataIntegrityProof')
        })
        .expect(200)
    })

    it('adds ed25519 proof on demand', async () => {
      await request(app)
        .post(`/instance/${tenantName}/credentials/sign?suite=ed25519`)
        .send(getUnsignedVCWithStatus())
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.issuer.id).to.eql('did:web:example.com')
          expect(res.body.proof.cryptosuite).not.to.exist
          expect(res.body.proof.type).to.eql('Ed25519Signature2020')
        })
        .expect(200)
    })

    it('adds both ed25519 and eddsa proofs', async () => {
      await request(app)
        .post(
          `/instance/${tenantName}/credentials/sign?suite=ed25519&suite=eddsa2022`
        )
        .send(getUnsignedVCWithStatus())
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.issuer.id).to.eql('did:web:example.com')
          expect(res.body.proof.length).to.eql(2)
          expect(
            res.body.proof.filter(
              (proof) => proof.type === 'Ed25519Signature2020'
            ).length
          ).to.eql(1)
          expect(
            res.body.proof.filter(
              (proof) => proof.type === 'DataIntegrityProof'
            ).length
          ).to.eql(1)
        })
        .expect(200)
    })
  })

  describe('/did-web-generator', () => {
    it('returns a new did:web', async () => {
      await request(app)
        .post(`/did-web-generator`)
        .send({
          url: 'https://raw.githubusercontent.com/jchartrand/didWebTest/main'
        })
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.seed).to.exist
          expect(res.body.didDocument.id).to.eql(
            'did:web:raw.githubusercontent.com:jchartrand:didWebTest:main'
          )
          expect(res.body.did).to.eql(
            'did:web:raw.githubusercontent.com:jchartrand:didWebTest:main'
          )
        })
        .expect(200)
    })

    it('forwards a missing request body to the error handler', async () => {
      const response = await request(app).post('/did-web-generator')

      expect(response.status).to.eql(500)
      expect(response.body.code).to.eql(500)
    })
  })

  describe('/did-key-generator', () => {
    it('returns a new did:key', async () => {
      await request(app)
        .get(`/did-key-generator`)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.seed).to.exist
          expect(res.body.didDocument.id).to.contain('did:key')
          expect(res.body.did).to.contain('did:key')
        })
        .expect(200)
    })
  })

  describe('/healthz', () => {
    it('returns 200 when healthy', async () => {
      await request(app)
        .get(`/healthz`)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body.message).to.contain('ok')
        })
        .expect(200)
    })

    it('returns 503 if the signed health credential has no proof', async () => {
      const originalPost = axios.post
      axios.post = async () => ({ data: {} })

      try {
        const response = await request(app).get('/healthz')

        expect(response.status).to.eql(503)
        expect(response.body.healthy).to.eql(false)
        expect(response.body.error).to.contain('healthz check failed')
      } finally {
        axios.post = originalPost
      }
    })
  })

  describe('/healthz fail', () => {
    // to force an error with the health check, we remove the
    // test issuer instance and it's signing seed

    beforeEach(async () => {
      // make sure all seeds have been loaded before we remove the test seed
      await getTenantSeed(TEST_TENANT_NAME)
      deleteSeed(TEST_TENANT_NAME)
      clearIssuerInstances()
    })

    after(async () => {
      resetConfig()
    })

    it('returns 503 when not healthy', async () => {
      await request(app)
        .get(`/healthz`)
        .expect('Content-Type', /json/)
        .expect((res) => {
          console.log('the body:')
          console.log(res.body)
          expect(res.body.error).to.contain('error')
        })
        .expect(503)
    })
  })
})

describe('Error middleware', () => {
  it('uses fallback code and message when an error has neither', () => {
    const response = {
      headerName: undefined,
      headerValue: undefined,
      statusCode: undefined,
      body: undefined,
      header(name, value) {
        this.headerName = name
        this.headerValue = value
        return this
      },
      status(code) {
        this.statusCode = code
        return this
      },
      json(body) {
        this.body = body
        return this
      }
    }

    errorHandler({}, {}, response)

    expect(response.headerName).to.eql('Content-Type')
    expect(response.headerValue).to.eql('application/json')
    expect(response.statusCode).to.eql(500)
    expect(response.body.code).to.eql(500)
    expect(response.body.message).to.contain('unknown error.')
  })

  it('logs an error and forwards it to the next middleware', () => {
    const error = { message: '', stack: 'test stack' }
    let forwardedError

    errorLogger(
      error,
      { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' },
      {},
      (nextError) => {
        forwardedError = nextError
      }
    )

    expect(forwardedError).to.equal(error)
  })
})
