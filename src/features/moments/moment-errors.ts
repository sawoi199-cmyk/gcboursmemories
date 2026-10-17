/** Expected request problems mapped to an HTTP status by the API routes. */
export class MomentRequestError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
  }
}
