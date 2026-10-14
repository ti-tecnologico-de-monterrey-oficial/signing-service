import { expect } from 'chai'
import { resetConfig, getConfig, getTenantSeed } from './config.js'

const tenantName = 'configtest'
const withEnvironment = async (overrides, test) => {
  const originalValues = Object.keys(overrides).map((key) => [key, process.env[key]])
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
  resetConfig()

  try {
    await test()
  } finally {
    for (const [key, value] of originalValues) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
    resetConfig()
  }
}

describe('Config', () => {
  before(async () => {})

  after(async () => {})

  beforeEach(async () => {
    resetConfig()
    delete process.env[`TENANT_SEED_${tenantName}`]
    delete process.env[`TENANT_DIDMETHOD_${tenantName}`]
  })

  afterEach(async () => {})

  describe('Application config', () => {
    it('uses defaults when config environment variables are absent', async () => {
      await withEnvironment(
        {
          PORT: undefined,
          ENABLE_HTTPS_FOR_DEV: undefined,
          ENABLE_ACCESS_LOGGING: undefined,
          CONSOLE_LOG_LEVEL: undefined,
          LOG_LEVEL: undefined,
          ERROR_LOG_FILE: undefined,
          LOG_ALL_FILE: undefined
        },
        async () => {
          const config = getConfig()

          expect(config).to.include({
            port: 4006,
            enableHttpsForDev: false,
            enableAccessLogging: false,
            consoleLogLevel: 'silly',
            logLevel: 'silly'
          })
          expect(getConfig()).to.equal(config)
        }
      )
    })

    it('normalizes configured values and enables optional settings', async () => {
      await withEnvironment(
        {
          PORT: '4010',
          ENABLE_HTTPS_FOR_DEV: 'TRUE',
          ENABLE_ACCESS_LOGGING: 'TRUE',
          CONSOLE_LOG_LEVEL: 'WARN',
          LOG_LEVEL: 'ERROR',
          ERROR_LOG_FILE: 'errors.log',
          LOG_ALL_FILE: 'all.log'
        },
        async () => {
          expect(getConfig()).to.include({
            port: 4010,
            enableHttpsForDev: true,
            enableAccessLogging: true,
            consoleLogLevel: 'warn',
            logLevel: 'error',
            errorLogFile: 'errors.log',
            logAllFile: 'all.log'
          })
        }
      )
    })

    it('generates a tenant seed and normalizes its DID method', async () => {
      await withEnvironment(
        {
          TENANT_SEED_GENERATEDTEST: 'generate',
          TENANT_DIDMETHOD_GENERATEDTEST: 'WEB',
          TENANT_DID_URL_GENERATEDTEST: 'https://example.com'
        },
        async () => {
          const tenant = await getTenantSeed('generatedtest')

          expect(tenant.didSeed).to.be.instanceOf(Uint8Array)
          expect(tenant.didSeed).to.have.length(32)
          expect(tenant.didMethod).to.eql('web')
          expect(tenant.didUrl).to.eql('https://example.com')
        }
      )
    })

    it('falls back to DID:key for an unsupported DID method', async () => {
      await withEnvironment(
        {
          TENANT_SEED_KEYTEST:
            'z1AeiPT496wWmo9BG2QYXeTusgFSZPNG3T9wNeTtjrQ3rCB',
          TENANT_DIDMETHOD_KEYTEST: 'unsupported'
        },
        async () => {
          const tenant = await getTenantSeed('keytest')
          expect(tenant.didMethod).to.eql('key')
        }
      )
    })
  })

  describe('DID Method', () => {
    it('defaults to use DID:key', async () => {
      process.env[`TENANT_SEED_${tenantName}`] =
        'z1AeiPT496wWmo9BG2QYXeTusgFSZPNG3T9wNeTtjrQ3rCB'
      const seed = await getTenantSeed('configtest')
      expect(seed.didMethod).to.eql('key')
    })

    it('uses DID:key when requested', async () => {
      process.env[`TENANT_SEED_${tenantName}`] =
        'z1AeiPT496wWmo9BG2QYXeTusgFSZPNG3T9wNeTtjrQ3rCB'
      process.env[`TENANT_DIDMETHOD_${tenantName}`] = 'key'
      const seed = await getTenantSeed('configtest')
      expect(seed.didMethod).to.eql('key')
    })

    it('uses DID:web when requested', async () => {
      process.env[`TENANT_SEED_${tenantName}`] =
        'z1AeiPT496wWmo9BG2QYXeTusgFSZPNG3T9wNeTtjrQ3rCB'
      process.env[`TENANT_DIDMETHOD_${tenantName}`] = 'web'
      const seed = await getTenantSeed('configtest')
      expect(seed.didMethod).to.eql('web')
    })
  })

  describe('DID Seed', () => {
    it('decodes multibase did seeds', async () => {
      process.env[`TENANT_SEED_${tenantName}`] =
        'z1AeiPT496wWmo9BG2QYXeTusgFSZPNG3T9wNeTtjrQ3rCB'
      const seed = await getTenantSeed('configtest')
      expect(seed.didSeed).to.eql(
        new Uint8Array([
          124, 79, 48, 59, 76, 20, 241, 121, 145, 117, 234, 181, 147, 37, 42,
          31, 235, 183, 82, 94, 9, 47, 29, 125, 59, 97, 120, 135, 61, 248, 40,
          204
        ])
      )
    })

    it('decodes non-multibase seeds', async () => {
      process.env[`TENANT_SEED_${tenantName}`] =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ'
      const seed = await getTenantSeed('configtest')
      expect(seed.didSeed).to.eql(
        new Uint8Array([
          97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
          111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 65, 66,
          67, 68, 69, 70
        ])
      )
    })

    it('throws an error when the seed is less than 32 bytes', async () => {
      process.env[`TENANT_SEED_${tenantName}`] = 'tooShort'
      try {
        getTenantSeed('configtest')
      } catch (err) {
        expect(err).to.eql(
          TypeError(
            '"secretKeySeed" must be at least 32 bytes, preferably multibase-encoded.'
          )
        )
      }
    })
  })
})
