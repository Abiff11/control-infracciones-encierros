import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
} from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler/dist/throttler-module-options.interface';
import type { ThrottlerStorage } from '@nestjs/throttler/dist/throttler-storage.interface';
import {
  THROTTLER_BLOCK_DURATION,
  THROTTLER_KEY_GENERATOR,
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TRACKER,
  THROTTLER_TTL,
} from '@nestjs/throttler/dist/throttler.constants';

@Injectable()
export class SelectiveThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    if (await this.shouldSkip(context)) {
      return true;
    }

    const results: boolean[] = [];

    for (const namedThrottler of this.throttlers) {
      const name = namedThrottler.name ?? 'default';
      const skip = this.reflector.getAllAndOverride<boolean>(
        THROTTLER_SKIP + name,
        [handler, classRef],
      );
      const skipIf = namedThrottler.skipIf || this.commonOptions.skipIf;

      if (skip || skipIf?.(context)) {
        results.push(true);
        continue;
      }

      const routeOrClassLimit = this.reflector.getAllAndOverride<
        number | ((context: ExecutionContext) => number)
      >(THROTTLER_LIMIT + name, [handler, classRef]);

      if (name !== 'default' && routeOrClassLimit === undefined) {
        results.push(true);
        continue;
      }

      const routeOrClassTtl = this.reflector.getAllAndOverride<
        number | ((context: ExecutionContext) => number)
      >(THROTTLER_TTL + name, [handler, classRef]);
      const routeOrClassBlockDuration = this.reflector.getAllAndOverride<
        number | ((context: ExecutionContext) => number)
      >(THROTTLER_BLOCK_DURATION + name, [handler, classRef]);
      const routeOrClassGetTracker = this.reflector.getAllAndOverride(
        THROTTLER_TRACKER + name,
        [handler, classRef],
      );
      const routeOrClassGetKeyGenerator = this.reflector.getAllAndOverride(
        THROTTLER_KEY_GENERATOR + name,
        [handler, classRef],
      );

      const limit = await this.resolveThrottlerValue(
        context,
        routeOrClassLimit || namedThrottler.limit,
      );
      const ttl = await this.resolveThrottlerValue(
        context,
        routeOrClassTtl || namedThrottler.ttl,
      );
      const blockDuration = await this.resolveThrottlerValue(
        context,
        routeOrClassBlockDuration || namedThrottler.blockDuration || ttl,
      );
      const getTracker =
        routeOrClassGetTracker ||
        namedThrottler.getTracker ||
        this.commonOptions.getTracker;
      const generateKey =
        routeOrClassGetKeyGenerator ||
        namedThrottler.generateKey ||
        this.commonOptions.generateKey;

      results.push(
        await this.handleRequest({
          context,
          limit,
          ttl,
          throttler: { ...namedThrottler, name },
          blockDuration,
          getTracker,
          generateKey,
        }),
      );
    }

    return results.every(Boolean);
  }

  private async resolveThrottlerValue<T>(
    context: ExecutionContext,
    value: T | ((context: ExecutionContext) => T),
  ) {
    return typeof value === 'function'
      ? (value as (context: ExecutionContext) => T)(context)
      : value;
  }
}
