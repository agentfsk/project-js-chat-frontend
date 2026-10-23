import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export function createLogger(name: string) {
  const logger = pino({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    base: { service: 'media-server', component: name },
  });

  return logger;
}