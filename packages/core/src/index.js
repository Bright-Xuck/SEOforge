// @forge/core
// Core domain models, interfaces, and base contracts.
// Platform-independent. No runtime dependencies.
/**
 * Creates a successful result.
 */
export function success(value) {
    return { ok: true, value };
}
/**
 * Creates a failed result.
 */
export function failure(error) {
    return { ok: false, error };
}
/**
 * Base error type for Forge.
 * Wraps low-level errors with context for higher layers.
 */
export class ForgeError extends Error {
    code;
    cause;
    constructor(code, message, cause) {
        super(message);
        this.name = "ForgeError";
        this.code = code;
        this.cause = cause;
    }
}
/**
 * Typed error for website reading failures.
 */
export class WebsiteReadError extends ForgeError {
    kind;
    statusCode;
    constructor(kind, message, cause, statusCode) {
        super(`WEBSITE_READ_${kind.toUpperCase().replace("-", "_")}`, message, cause);
        this.name = "WebsiteReadError";
        this.kind = kind;
        this.statusCode = statusCode;
    }
}
/**
 * Typed error for provider operations.
 */
export class ProviderError extends ForgeError {
    kind;
    statusCode;
    constructor(kind, message, cause, statusCode) {
        super(`PROVIDER_${kind.toUpperCase().replace("-", "_")}`, message, cause);
        this.name = "ProviderError";
        this.kind = kind;
        this.statusCode = statusCode;
    }
}
//# sourceMappingURL=index.js.map