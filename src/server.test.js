import http from 'node:http'
import https from 'node:https'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetConfig } from './config.js'
import { createServer, start } from './server.js'

describe('server', () => {
  let server

  beforeEach(() => {
    // Puerto 0: el sistema asigna uno libre y la prueba no choca con otro proceso.
    vi.stubEnv('PORT', '0')
    resetConfig()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(async () => {
    if (server?.listening) await new Promise((resolve) => server.close(resolve))
    server = undefined
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    resetConfig()
  })

  it('creates an http server when https for dev is disabled', () => {
    const created = createServer(() => {}, false)

    expect(created).toBeInstanceOf(http.Server)
    expect(created).not.toBeInstanceOf(https.Server)
  })

  it('creates an https server with the dev certificate when enabled', () => {
    expect(createServer(() => {}, true)).toBeInstanceOf(https.Server)
  })

  it('starts listening on the configured port', async () => {
    server = await start()

    expect(server.listening).toBe(true)
    expect(server.address().port).toBeGreaterThan(0)
    expect(console.log).toHaveBeenCalledWith('Server running on port 0')
  })

  it('starts an https server when https for dev is enabled', async () => {
    vi.stubEnv('ENABLE_HTTPS_FOR_DEV', 'true')
    resetConfig()

    server = await start()

    expect(server).toBeInstanceOf(https.Server)
    expect(server.listening).toBe(true)
  })
})
