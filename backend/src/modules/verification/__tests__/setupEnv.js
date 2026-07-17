/** Test environment variables — loaded before any module import. */
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.APISETU_BASE_URL = "https://apisetu.test";
process.env.APISETU_CLIENT_ID = "test-client";
process.env.APISETU_CLIENT_SECRET = "test-secret";
process.env.APISETU_API_KEY = "test-key-1,test-key-2";
process.env.APISETU_REQUEST_TIMEOUT = "2000";
process.env.APISETU_MAX_RETRIES = "1";
// 64 hex chars (32 bytes)
process.env.VERIFICATION_ENCRYPTION_KEY = "a".repeat(64);
