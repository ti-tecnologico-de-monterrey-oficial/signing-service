import winston from 'winston'
import { getConfig } from '../config.js'

const { errorLogFile, logAllFile, logLevel, consoleLogLevel } = getConfig()
/* 
These are the default npm logging levels
that Winston uses, but we include them explicitly
here in case you want to change them
*/
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}

// La severidad sale de LOG_LEVEL; config.js usa 'silly' cuando no está definida.
const level = () => logLevel

const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
)

/* 
Here we output as defined in the env
*/
const transports = []

if (consoleLogLevel.toLowerCase() !== 'none') {
  transports.push(
    new winston.transports.Console({
      level: consoleLogLevel
    })
  )
}

if (errorLogFile) {
  transports.push(
    new winston.transports.File({
      filename: errorLogFile,
      level: 'error'
    })
  )
}

if (logAllFile) {
  transports.push(
    new winston.transports.File({
      filename: logAllFile
    })
  )
}

const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports
})

export default logger
