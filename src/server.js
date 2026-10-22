import https from 'https'
import http from 'http'
import fs from 'fs'
import { build } from './app.js'
import { getConfig, setConfig } from './config.js'

export function createServer(app, enableHttpsForDev) {
  if (!enableHttpsForDev) return http.createServer(app)
  return https.createServer(
    {
      key: fs.readFileSync('server-dev-only.key'),
      cert: fs.readFileSync('server-dev-only.cert')
    },
    app
  )
}

export async function start() {
  await setConfig()
  const { port, enableHttpsForDev } = getConfig()

  const app = await build()
  const server = createServer(app, enableHttpsForDev)

  await new Promise((resolve) => server.listen(port, resolve))
  console.log(`Server running on port ${port}`)
  return server
}
