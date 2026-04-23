import { createLogger, format, transports } from 'winston';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    // Write all logs to a comprehensive file
    new transports.File({ filename: path.join(logDir, 'etl-pipeline.log') }),
    // Write exclusively error logs for faster triaging
    new transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' })
  ]
});

// Always append the console output formatting for developers
logger.add(new transports.Console({
  format: format.combine(
    format.colorize(),
    format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  )
}));
