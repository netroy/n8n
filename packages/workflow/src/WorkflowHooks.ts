import type {
	IWorkflowBase,
	IWorkflowExecuteHooks,
	IWorkflowHooksOptionalParameters,
	WorkflowExecuteHookName,
	WorkflowExecuteMode,
} from './Interfaces';

export class WorkflowHooks {
	mode: WorkflowExecuteMode;

	workflowData: IWorkflowBase;

	executionId: string;

	sessionId?: string;

	retryOf?: string;

	hookFunctions: IWorkflowExecuteHooks;

	constructor(
		hookFunctions: IWorkflowExecuteHooks,
		mode: WorkflowExecuteMode,
		executionId: string,
		workflowData: IWorkflowBase,
		optionalParameters?: IWorkflowHooksOptionalParameters,
	) {
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		optionalParameters = optionalParameters || {};

		this.hookFunctions = hookFunctions;
		this.mode = mode;
		this.executionId = executionId;
		this.workflowData = workflowData;
		this.sessionId = optionalParameters.sessionId;
		// retryOf might be `null` from TypeORM
		this.retryOf = optionalParameters.retryOf ?? undefined;
	}

	async executeHookFunctions(hookName: WorkflowExecuteHookName, parameters: unknown[]) {
		const hooks = this.hookFunctions[hookName] ?? [];
		for (const hookFunction of hooks) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			await hookFunction?.apply(this, parameters);
		}
	}
}
