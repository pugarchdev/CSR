import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { getApiSetuConfig } from "../../../config/env";
import { logger } from "../utils/logger";
import { VerificationError } from "../utils/errors";

/**
 * Secure HTTP client for API Setu (Government of India).
 *
 * - Bounded retry with exponential backoff + jitter (network errors, 5xx, 429 only — never other 4xx)
 * - Request timeout from APISETU_REQUEST_TIMEOUT
 * - API key rotation: APISETU_API_KEY accepts a comma-separated list; a 401
 *   advances to the next key and retries once per remaining key
 * - Correlation ID propagated as X-Request-Id
 * - Request bodies are NEVER logged (they may contain Aadhaar numbers/OTPs)
 */

let keyIndex = 0;

const getActiveApiKey = (apiKeys: string[]): string => {
  if (apiKeys.length === 0) return "";
  return apiKeys[keyIndex % apiKeys.length];
};

const rotateApiKey = (apiKeys: string[]): boolean => {
  if (apiKeys.length <= 1) return false;
  keyIndex = (keyIndex + 1) % apiKeys.length;
  return true;
};

/** Exposed for tests. */
export const __resetKeyRotation = () => {
  keyIndex = 0;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error: AxiosError): boolean => {
  if (!error.response) return true; // network error / timeout
  const status = error.response.status;
  return status >= 500 || status === 429;
};

const buildClient = (): AxiosInstance => {
  const config = getApiSetuConfig();
  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.requestTimeoutMs,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  });
};

export interface ApiSetuRequestOptions {
  method: "GET" | "POST";
  path: string;
  data?: Record<string, unknown>;
  params?: Record<string, string>;
  correlationId: string;
}

export interface ApiSetuResponse<T = any> {
  data: T;
  status: number;
  responseTimeMs: number;
}

export const callApiSetu = async <T = any>(options: ApiSetuRequestOptions): Promise<ApiSetuResponse<T>> => {
  const config = getApiSetuConfig();
  const client = buildClient();
  const startTime = Date.now();

  let attempt = 0;
  let keyRotations = 0;
  // total attempts = 1 initial + maxRetries backoff retries; key rotations are separate
  // and bounded by the number of configured keys.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const requestConfig: AxiosRequestConfig = {
      method: options.method,
      url: options.path,
      data: options.data,
      params: options.params,
      headers: {
        "X-APISETU-CLIENTID": config.clientId,
        "X-APISETU-APIKEY": getActiveApiKey(config.apiKeys),
        "X-Request-Id": options.correlationId
      }
    };

    try {
      const response = await client.request<T>(requestConfig);
      const responseTimeMs = Date.now() - startTime;
      logger.info("apisetu_call_ok", {
        correlationId: options.correlationId,
        method: options.method,
        path: options.path,
        status: response.status,
        responseTimeMs,
        attempt
      });
      return { data: response.data, status: response.status, responseTimeMs };
    } catch (err) {
      const error = err as AxiosError;
      const status = error.response?.status;
      const responseTimeMs = Date.now() - startTime;

      logger.warn("apisetu_call_failed", {
        correlationId: options.correlationId,
        method: options.method,
        path: options.path,
        status: status ?? "network",
        code: error.code,
        responseTimeMs,
        attempt
      });

      // Invalid credentials: rotate to the next configured key once per key.
      if (status === 401 && keyRotations < config.apiKeys.length - 1 && rotateApiKey(config.apiKeys)) {
        keyRotations++;
        continue;
      }

      if (isRetryable(error) && attempt < config.maxRetries) {
        attempt++;
        const backoffMs = 500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
        await sleep(backoffMs);
        continue;
      }

      // Map to stable internal error codes; upstream bodies never propagate to clients.
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        throw new VerificationError("APISETU_TIMEOUT", 504);
      }
      if (!error.response) {
        throw new VerificationError("APISETU_UNAVAILABLE", 503);
      }
      if (status === 401 || status === 403) {
        throw new VerificationError("APISETU_UNAUTHORIZED", 502);
      }
      if (status === 429) {
        throw new VerificationError("APISETU_RATE_LIMITED", 429);
      }
      if (status && status >= 500) {
        throw new VerificationError("APISETU_UNAVAILABLE", 503);
      }
      // Other 4xx (invalid input, not found) — caller maps to a domain error.
      throw error;
    }
  }
};

export const getUpstreamStatus = (err: unknown): number | undefined => {
  return axios.isAxiosError(err) ? err.response?.status : undefined;
};

export const getUpstreamErrorBody = (err: unknown): any => {
  return axios.isAxiosError(err) ? err.response?.data : undefined;
};
