import 'reflect-metadata';

jest.mock('axios');
jest.mock('child_process');
jest.mock('cli-highlight');
jest.mock('cron');
jest.mock('crypto-js');
jest.mock('date-fns');
jest.mock('express-handlebars');
jest.mock('file-type');
jest.mock('fs/promises');
jest.mock('ioredis');
jest.mock('posthog-node');
jest.mock('syslog-client');
jest.mock('transliteration');
jest.mock('typeorm');
jest.mock('@/eventbus/MessageEventBus/MessageEventBus');
jest.mock('@/push');
jest.mock('@/telemetry');
jest.mock('@n8n_io/license-sdk');
jest.mock('@n8n/tournament');
jest.mock('@sentry/node');
