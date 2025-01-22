export class PRTGError extends Error {
  constructor(
    public readonly message: string,
    public readonly code?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'PRTGError';
    Object.setPrototypeOf(this, PRTGError.prototype);
  }

  static fromAxiosError(error: any): PRTGError {
    const status = error.response?.status || 'unknown';
    const statusText = error.response?.statusText || 'Unknown error';
    return new PRTGError(
      `PRTG API Error (${status}): ${statusText}`,
      String(status),
      error.response?.data
    );
  }
}
