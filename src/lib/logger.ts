// Logger utility for consistent console messages
// Only shows in browser console, no data exposure

export enum LogLevel {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

interface LogMessage {
  message: string;
  data?: any;
  level: LogLevel;
}

class Logger {
  private formatMessage(message: string, level: LogLevel): string {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      [LogLevel.INFO]: '📋 INFO',
      [LogLevel.SUCCESS]: '✅ SUCCESS',
      [LogLevel.WARNING]: '⚠️ WARNING',
      [LogLevel.ERROR]: '❌ ERROR'
    }[level];
    
    return `[${timestamp}] ${prefix}: ${message}`;
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage(message, LogLevel.INFO), data || '');
  }

  success(message: string, data?: any): void {
    console.log(this.formatMessage(message, LogLevel.SUCCESS), data || '');
  }

  warning(message: string, data?: any): void {
    console.warn(this.formatMessage(message, LogLevel.WARNING), data || '');
  }

  error(message: string, data?: any): void {
    console.error(this.formatMessage(message, LogLevel.ERROR), data || '');
  }

  // Specific action methods
  loaded(component: string): void {
    this.success(`${component} loaded successfully`);
  }

  fetched(resource: string): void {
    this.success(`${resource} data fetched`);
  }

  assigned(item: string, to: string): void {
    this.success(`${item} assigned to ${to}`);
  }

  created(resource: string): void {
    this.success(`${resource} created successfully`);
  }

  updated(resource: string): void {
    this.success(`${resource} updated successfully`);
  }

  deleted(resource: string): void {
    this.success(`${resource} deleted successfully`);
  }

  failed(action: string, reason: string): void {
    this.error(`${action} failed: ${reason}`);
  }

  processing(action: string): void {
    this.info(`Processing ${action}...`);
  }

  completed(action: string): void {
    this.success(`${action} completed`);
  }
}

export const logger = new Logger();
export default logger;
