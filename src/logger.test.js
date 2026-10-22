import { afterEach, describe, expect, it, vi } from 'vitest'

// Los transports se arman al importar el módulo, así que cada caso lo vuelve
// a cargar con las variables de log ya fijadas.
async function loadLoggerWith(env) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)
  vi.resetModules()
  const { resetConfig } = await import('./config.js')
  resetConfig()
  const { default: logger } = await import('./utils/logger.js')
  return logger
}

describe('logger', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('writes to the console and both log files when they are configured', async () => {
    const logger = await loadLoggerWith({
      CONSOLE_LOG_LEVEL: 'info',
      ERROR_LOG_FILE: 'logs/error.log',
      LOG_ALL_FILE: 'logs/all.log'
    })

    expect(logger.transports.map((t) => t.name)).toEqual([
      'console',
      'file',
      'file'
    ])
  })

  it('has no transports when the console is disabled and no files are set', async () => {
    const logger = await loadLoggerWith({
      CONSOLE_LOG_LEVEL: 'none',
      ERROR_LOG_FILE: '',
      LOG_ALL_FILE: ''
    })

    expect(logger.transports).toHaveLength(0)
  })
})
