/**
 * Centralized logging utility
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

class Logger {
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const context = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] [${level}] ${message}${context}`;
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage(LogLevel.ERROR, message, ...args));
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, ...args));
  }

  info(message: string, ...args: any[]): void {
    console.log(this.formatMessage(LogLevel.INFO, message, ...args));
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage(LogLevel.DEBUG, message, ...args));
    }
  }
}

export const logger = new Logger();


