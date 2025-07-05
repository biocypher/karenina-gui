/**
 * Structured logging utility to replace console.log statements
 * with consistent, filterable logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  timestamp: Date;
  component?: string;
}

/**
 * Application logger with categorized, structured logging
 */
class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const componentInfo = entry.component ? ` [${entry.component}]` : '';
    return `[${timestamp}] ${levelName}${componentInfo} [${entry.category}] ${entry.message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formattedMessage = this.formatMessage(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, entry.data);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, entry.data);
        break;
    }
  }

  /**
   * Application lifecycle events
   */
  lifecycle = {
    appInit: (sessionId: string) => 
      this.log({
        level: LogLevel.INFO,
        category: 'LIFECYCLE',
        message: `App initialized with session: ${sessionId}`,
        timestamp: new Date(),
      }),

    dataReset: () =>
      this.log({
        level: LogLevel.INFO,
        category: 'LIFECYCLE', 
        message: 'All data has been reset',
        timestamp: new Date(),
      }),
  };

  /**
   * Data operations
   */
  data = {
    questionsExtracted: (count: number) =>
      this.log({
        level: LogLevel.INFO,
        category: 'DATA',
        message: `Extracted ${count} questions`,
        timestamp: new Date(),
      }),

    checkpointCreated: (count: number, type: 'complete' | 'fresh') =>
      this.log({
        level: LogLevel.INFO,
        category: 'DATA',
        message: `Created ${type} checkpoint with ${count} questions`,
        timestamp: new Date(),
      }),

    checkpointLoaded: (count: number, type: 'self-contained' | 'legacy') =>
      this.log({
        level: LogLevel.INFO,
        category: 'DATA',
        message: `${type} checkpoint loaded with ${count} questions`,
        timestamp: new Date(),
      }),

    templatesGenerated: (count: number) =>
      this.log({
        level: LogLevel.INFO,
        category: 'DATA',
        message: `Added ${count} successfully generated templates to curation`,
        timestamp: new Date(),
      }),
  };

  /**
   * Warning events
   */
  warn = {
    placeholderTemplates: () =>
      this.log({
        level: LogLevel.WARN,
        category: 'VALIDATION',
        message: 'Detected placeholder templates! This should not happen.',
        timestamp: new Date(),
      }),

    noAnswerTemplates: () =>
      this.log({
        level: LogLevel.WARN,
        category: 'VALIDATION',
        message: "Questions don't have answer templates!",
        timestamp: new Date(),
      }),

    noGeneratedTemplates: () =>
      this.log({
        level: LogLevel.WARN,
        category: 'TEMPLATES',
        message: 'No successfully generated templates available',
        timestamp: new Date(),
      }),

    noQuestionData: () =>
      this.log({
        level: LogLevel.WARN,
        category: 'DATA',
        message: 'Legacy checkpoint loaded but no question data available',
        timestamp: new Date(),
      }),
  };

  /**
   * Debug information
   */
  debug = {
    checkpointMatching: (count: number) =>
      this.log({
        level: LogLevel.DEBUG,
        category: 'CHECKPOINT',
        message: `Checkpoint matches ${count} questions - progress will be restored`,
        timestamp: new Date(),
      }),

    questionsWithTemplates: (count: number) =>
      this.log({
        level: LogLevel.DEBUG,
        category: 'TEMPLATES',
        message: `Loading questions with GENERATED templates (${count} specific descriptions)`,
        timestamp: new Date(),
      }),

    checkpointOperation: (operation: string, data?: unknown) =>
      this.log({
        level: LogLevel.DEBUG,
        category: 'CHECKPOINT',
        message: operation,
        data,
        timestamp: new Date(),
      }),
  };

  /**
   * Generic methods for component-specific logging
   */
  info(category: string, message: string, component?: string, data?: unknown): void {
    this.log({
      level: LogLevel.INFO,
      category,
      message,
      component,
      data,
      timestamp: new Date(),
    });
  }

  warning(category: string, message: string, component?: string, data?: unknown): void {
    this.log({
      level: LogLevel.WARN,
      category,
      message,
      component,
      data,
      timestamp: new Date(),
    });
  }

  error(category: string, message: string, component?: string, data?: unknown): void {
    this.log({
      level: LogLevel.ERROR,
      category,
      message,
      component,
      data,
      timestamp: new Date(),
    });
  }

  debugLog(category: string, message: string, component?: string, data?: unknown): void {
    this.log({
      level: LogLevel.DEBUG,
      category,
      message,
      component,
      data,
      timestamp: new Date(),
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for backward compatibility
export const logInfo = (category: string, message: string, component?: string, data?: unknown) =>
  logger.info(category, message, component, data);

export const logWarn = (category: string, message: string, component?: string, data?: unknown) =>
  logger.warning(category, message, component, data);

export const logError = (category: string, message: string, component?: string, data?: unknown) =>
  logger.error(category, message, component, data);

export const logDebug = (category: string, message: string, component?: string, data?: unknown) =>
  logger.debugLog(category, message, component, data);