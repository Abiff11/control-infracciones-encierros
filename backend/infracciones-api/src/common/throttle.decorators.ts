import { Throttle } from '@nestjs/throttler';

export const ReadThrottle = () =>
  Throttle({ read: { ttl: Number(process.env.THROTTLE_READ_TTL_MS ?? 60_000), limit: Number(process.env.THROTTLE_READ_LIMIT ?? 240) } });

export const WriteThrottle = () =>
  Throttle({ write: { ttl: Number(process.env.THROTTLE_WRITE_TTL_MS ?? 60_000), limit: Number(process.env.THROTTLE_WRITE_LIMIT ?? 80) } });

export const AuthThrottle = () =>
  Throttle({ auth: { ttl: Number(process.env.THROTTLE_AUTH_TTL_MS ?? 60_000), limit: Number(process.env.THROTTLE_AUTH_LIMIT ?? 20) } });

export const RefreshThrottle = () =>
  Throttle({ refresh: { ttl: Number(process.env.THROTTLE_REFRESH_TTL_MS ?? 60_000), limit: Number(process.env.THROTTLE_REFRESH_LIMIT ?? 60) } });

export const ReportThrottle = () =>
  Throttle({ report: { ttl: Number(process.env.THROTTLE_REPORT_TTL_MS ?? 60_000), limit: Number(process.env.THROTTLE_REPORT_LIMIT ?? 20) } });

export const ImportThrottle = () =>
  Throttle({ import: { ttl: Number(process.env.THROTTLE_IMPORT_TTL_MS ?? 60_000), limit: Number(process.env.THROTTLE_IMPORT_LIMIT ?? 5) } });

export const UploadThrottle = () =>
  Throttle({ upload: { ttl: Number(process.env.THROTTLE_UPLOAD_TTL_MS ?? 60_000), limit: Number(process.env.THROTTLE_UPLOAD_LIMIT ?? 5) } });

export const SearchThrottle = () =>
  Throttle({ search: { ttl: Number(process.env.THROTTLE_SEARCH_TTL_MS ?? 60_000), limit: Number(process.env.THROTTLE_SEARCH_LIMIT ?? 60) } });
