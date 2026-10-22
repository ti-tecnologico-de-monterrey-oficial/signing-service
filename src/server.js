import https from 'node:https'
import http from 'node:http'
import fs from 'node:fs'
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
  setConfig()
  const { port, enableHttpsForDev } = getConfig()

  const app = await build()
  const server = createServer(app, enableHttpsForDev)

  await new Promise((resolve) => server.listen(port, resolve))
  console.log(`Server running on port ${port}`)
  return server
}
