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
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { toSaveSettings } from './to-save-settings';

export type ExecutionLifecycleHookContext = {
	executionId: string;
	executionMode: WorkflowExecuteMode;
	workflowData: IWorkflowBase;
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
			context: ExecutionLifecycleHookContext,
			nodeName: string,
			data: ITaskStartedData,
		) => Promise<void> | void
	>;

	nodeExecuteAfter: Array<
		(
			context: ExecutionLifecycleHookContext,
			nodeName: string,
			data: ITaskData,
			executionData: IRunExecutionData,
		) => Promise<void> | void
	>;

	workflowExecuteBefore: Array<(context: ExecutionLifecycleHookContext) => Promise<void> | void>;

	workflowExecuteAfter: Array<
		(
			context: ExecutionLifecycleHookContext,
			data: IRun,
			newStaticData?: IDataObject,
		) => Promise<void> | void
	>;

	/** Used by trigger and webhook nodes to respond back to the request */
	sendResponse: Array<
		(
			context: ExecutionLifecycleHookContext,
			response: IExecuteResponsePromiseData,
		) => Promise<void> | void
	>;

	/** Used by nodes to send chunks to streaming responses */
	sendChunk: Array<
		(context: ExecutionLifecycleHookContext, chunk: StructuredChunk) => Promise<void> | void
	>;

	/**
	 * Executed after a node fetches data
	 * - For a webhook node, after the node had been run.
   * - For a http-request node, or any other node that makes http requests that still use the deprecated request* methods, after every successful http request
s	 */
	nodeFetchedData: Array<
		(context: ExecutionLifecycleHookContext, node: INode) => Promise<void> | void
	>;
};

export type ExecutionLifecycleHookName = keyof ExecutionLifecycleHookHandlers;

export type RunExecutionLifecycleHook = <
	Hook extends keyof ExecutionLifecycleHookHandlers,
	Params extends unknown[] = Parameters<
		Exclude<ExecutionLifecycleHookHandlers[Hook], undefined>[number]
	>,
>(
	hookName: Hook,
	parameters: Params,
) => Promise<void>;

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
 * const hooks = new ExecutionLifecycleHooks();
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

	addHandler<Hook extends keyof ExecutionLifecycleHookHandlers>(
		hookName: Hook,
		...handlers: Array<ExecutionLifecycleHookHandlers[Hook][number]>
	): void {
		// @ts-expect-error FIX THIS
		this.handlers[hookName].push(...handlers);
	}

	withContext(
		context: Omit<ExecutionLifecycleHookContext, 'saveSettings'>,
	): RunExecutionLifecycleHook {
		const saveSettings = toSaveSettings(context.workflowData.settings);
		return async (hookName, parameters) => {
			const hooks = this.handlers[hookName];
			for (const hookFunction of hooks) {
				// @ts-expect-error
				// eslint-disable-next-line n8n-local-rules/no-argument-spread
				await hookFunction({ ...context, saveSettings }, ...parameters);
			}
		};
	}
}
