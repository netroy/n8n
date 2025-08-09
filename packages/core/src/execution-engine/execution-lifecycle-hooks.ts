import type {
	IDataObject,
	IExecuteResponsePromiseData,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
	IWorkflowBase,
	StructuredChunk,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

export type HookExecutionContext = {
	executionId: string;
	executionMode: WorkflowExecuteMode;
	workflowData: IWorkflowBase;
	workflowInstance?: Workflow;
	saveSettings: {
		error: boolean | 'all' | 'none';
		success: boolean | 'all' | 'none';
		manual: boolean;
		progress: boolean;
	};
	pushRef?: string;
	retryOf?: string;
	userId?: string;
};

export type ExecutionLifecycleHookHandlers = {
	nodeExecuteBefore: Array<
		(
			context: HookExecutionContext,
			nodeName: string,
			data: ITaskStartedData,
		) => Promise<void> | void
	>;

	nodeExecuteAfter: Array<
		(
			context: HookExecutionContext,
			nodeName: string,
			data: ITaskData,
			executionData: IRunExecutionData,
		) => Promise<void> | void
	>;

	workflowExecuteBefore: Array<(context: HookExecutionContext) => Promise<void> | void>;

	workflowExecuteAfter: Array<
		(context: HookExecutionContext, data: IRun, newStaticData?: IDataObject) => Promise<void> | void
	>;

	/** Used by trigger and webhook nodes to respond back to the request */
	sendResponse: Array<
		(context: HookExecutionContext, response: IExecuteResponsePromiseData) => Promise<void> | void
	>;

	/** Used by nodes to send chunks to streaming responses */
	sendChunk: Array<(context: HookExecutionContext, chunk: StructuredChunk) => Promise<void> | void>;

	/**
	 * Executed after a node fetches data
	 * - For a webhook node, after the node had been run.
   * - For a http-request node, or any other node that makes http requests that still use the deprecated request* methods, after every successful http request
s	 */
	nodeFetchedData: Array<(context: HookExecutionContext, node: INode) => Promise<void> | void>;
};

export type ExecutionLifecycleHookName = keyof ExecutionLifecycleHookHandlers;

/**
 * Contains hooks that trigger at specific events in an execution's lifecycle. Every hook has an array of callbacks to run.
 *
 * Common use cases include:
 * - Saving execution progress to database
 * - Pushing execution status updates to the frontend
 * - Recording workflow statistics
 * - Running external hooks for execution events
 * - Error and Cancellation handling and cleanup
 *
 * @example
 * ```typescript
 * const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData);
 * hooks.add('workflowExecuteAfter, async function(fullRunData) {
 *  await saveToDatabase(executionId, fullRunData);
 *});
 * ```
 */
export class ExecutionLifecycleHooks {
	readonly handlers: ExecutionLifecycleHookHandlers = {
		nodeExecuteAfter: [],
		nodeExecuteBefore: [],
		nodeFetchedData: [],
		sendResponse: [],
		workflowExecuteAfter: [],
		workflowExecuteBefore: [],
		sendChunk: [],
	};

	constructor(
		/** @deprecated this should not be here, so that we can reuse hooks setup across executions */
		private readonly context: HookExecutionContext,
	) {}

	addHandler<Hook extends keyof ExecutionLifecycleHookHandlers>(
		hookName: Hook,
		...handlers: Array<ExecutionLifecycleHookHandlers[Hook][number]>
	): void {
		// @ts-expect-error FIX THIS
		this.handlers[hookName].push(...handlers);
	}

	async runHook<
		Hook extends keyof ExecutionLifecycleHookHandlers,
		Params extends unknown[] = Parameters<
			Exclude<ExecutionLifecycleHookHandlers[Hook], undefined>[number]
		>,
	>(hookName: Hook, parameters: Params) {
		const hooks = this.handlers[hookName];
		for (const hookFunction of hooks) {
			const typedHookFunction = hookFunction as unknown as (
				context: HookExecutionContext,
				...args: Params
			) => Promise<void>;
			// eslint-disable-next-line n8n-local-rules/no-argument-spread
			await typedHookFunction(this.context, ...parameters);
		}
	}
}
