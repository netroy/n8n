import { resolveParameter } from '@/mixins/workflowHelpers';
import type { DocMetadata } from '@8n8/workflow';

export type Resolved = ReturnType<typeof resolveParameter>;

export type ExtensionTypeName = 'number' | 'string' | 'date' | 'array' | 'object';

export type FnToDoc = { [fnName: string]: { doc?: DocMetadata } };
