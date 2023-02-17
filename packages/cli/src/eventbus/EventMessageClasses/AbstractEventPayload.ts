import type { IWorkflowBase, JsonValue } from '@8n8/workflow';

export interface AbstractEventPayload {
	[key: string]: JsonValue | IWorkflowBase | undefined;
}
