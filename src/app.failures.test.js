import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetConfig } from './config.js'
import { clearIssuerInstances } from './issue.js'
import logger from './utils/logger.js'
import { getUnsignedVC } from './test-fixtures/vc.js'

// Fallas de dependencias que no se pueden provocar con datos de entrada: se
// simulan con mocks, por eso viven aparte de app.test.js.
const mocks = vi.hoisted(() => ({
  generateSeed: vi.fn(),
  signVC: vi.fn()
}))

vi.mock('./generate.js', () => ({ default: mocks.generateSeed }))

vi.mock('@digitalbazaar/vc', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, issue: mocks.signVC }
})

const { build } = await import('./app.js')

describe('dependency failures', () => {
  let app

  beforeEach(async () => {
    resetConfig()
    clearIssuerInstances()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    app = await build()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    mocks.generateSeed.mockReset()
    mocks.signVC.mockReset()
  })

  it('forwards a did:key generation failure to the error handler', async () => {
    mocks.generateSeed.mockRejectedValue({ code: 500, message: 'seed failed' })

    const response = await request(app).get('/did-key-generator')

    expect(response.status).toBe(500)
    expect(response.body.message).toContain('seed failed')
  })

  it('reports the service as unhealthy when the health signature has no proof', async () => {
    mocks.signVC.mockResolvedValue({})

    const response = await request(app).get('/healthz')

    expect(response.status).toBe(503)
    expect(response.body.healthy).toBe(false)
    expect(response.body.error).toContain('healthz check failed')
  })

  it('logs and rethrows a signing failure', async () => {
    const failure = Object.assign(new Error('signing failed'), { code: 500 })
    mocks.signVC.mockRejectedValue(failure)

    const response = await request(app)
      .post('/instance/testing/credentials/sign')
      .send(getUnsignedVC())

    expect(response.status).toBe(500)
    expect(console.error).toHaveBeenCalledWith(failure)
  })
})

describe('access logging', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    resetConfig()
  })

  it('writes each request to the http log when enabled', async () => {
    vi.stubEnv('ENABLE_ACCESS_LOGGING', 'true')
    resetConfig()
    const http = vi.spyOn(logger, 'http').mockImplementation(() => {})
    const app = await build()

    await request(app).get('/')

    expect(http).toHaveBeenCalledWith(expect.stringContaining('GET / 200'))
  })
})
