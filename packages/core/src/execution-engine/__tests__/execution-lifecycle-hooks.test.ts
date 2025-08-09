import { mock } from 'jest-mock-extended';
import type {
	IExecuteResponsePromiseData,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
	IWorkflowBase,
	Workflow,
} from 'n8n-workflow';

import type {
	ExecutionLifecycleHookName,
	ExecutionLifecycleHookHandlers,
	HookExecutionContext,
} from '../execution-lifecycle-hooks';
import { ExecutionLifecycleHooks } from '../execution-lifecycle-hooks';

describe('ExecutionLifecycleHooks', () => {
	const executionId = '123';
	const workflowData = mock<IWorkflowBase>();
	const workflowInstance = mock<Workflow>();

	let hooks: ExecutionLifecycleHooks;
	beforeEach(() => {
		jest.clearAllMocks();
		const context: HookExecutionContext = {
			executionId,
			executionMode: 'internal',
			workflowData,
			workflowInstance,
			saveSettings: mock(),
		};
		hooks = new ExecutionLifecycleHooks(context);
	});

	describe('constructor()', () => {
		it('should initialize with correct properties', () => {
			expect(hooks.handlers).toEqual({
				nodeExecuteAfter: [],
				nodeExecuteBefore: [],
				nodeFetchedData: [],
				sendResponse: [],
				workflowExecuteAfter: [],
				workflowExecuteBefore: [],
				sendChunk: [],
			});
		});
	});

	describe('addHandler()', () => {
		const hooksHandlers =
			mock<{
				[K in keyof ExecutionLifecycleHookHandlers]: ExecutionLifecycleHookHandlers[K][number];
			}>();

		const context = {} as HookExecutionContext;
		const testCases: Array<{
			hook: ExecutionLifecycleHookName;
			args: Parameters<
				ExecutionLifecycleHookHandlers[keyof ExecutionLifecycleHookHandlers][number]
			>;
		}> = [
			{ hook: 'nodeExecuteBefore', args: [context, 'testNode', mock<ITaskStartedData>()] },
			{
				hook: 'nodeExecuteAfter',
				args: [context, 'testNode', mock<ITaskData>(), mock<IRunExecutionData>()],
			},
			{
				hook: 'workflowExecuteBefore',
				args: [context],
			},
			{ hook: 'workflowExecuteAfter', args: [context, mock<IRun>()] },
			{ hook: 'sendResponse', args: [context, mock<IExecuteResponsePromiseData>()] },
			{ hook: 'nodeFetchedData', args: [context, mock<INode>()] },
		];

		test.each(testCases)(
			'should add handlers to $hook hook and call them',
			async ({ hook, args }) => {
				hooks.addHandler(hook, hooksHandlers[hook]);
				await hooks.runHook(hook, args);
				// eslint-disable-next-line n8n-local-rules/no-argument-spread
				expect(hooksHandlers[hook]).toHaveBeenCalledWith(expect.anything(), ...args);
			},
		);
	});

	describe('runHook()', () => {
		it('should execute multiple hooks in order', async () => {
			const executionOrder: string[] = [];
			const hook1 = jest.fn().mockImplementation(async () => {
				executionOrder.push('hook1');
			});
			const hook2 = jest.fn().mockImplementation(async () => {
				executionOrder.push('hook2');
			});

			hooks.addHandler('nodeExecuteBefore', hook1, hook2);
			await hooks.runHook('nodeExecuteBefore', ['testNode', mock()]);

			expect(executionOrder).toEqual(['hook1', 'hook2']);
			expect(hook1).toHaveBeenCalled();
			expect(hook2).toHaveBeenCalled();
		});

		it('should maintain correct the context', async () => {
			const hook = jest.fn().mockImplementation(async function (context: HookExecutionContext) {
				expect(context.executionId).toBe(executionId);
				expect(context.executionMode).toBe('internal');
			});

			hooks.addHandler('nodeExecuteBefore', hook);
			await hooks.runHook('nodeExecuteBefore', ['testNode', mock()]);

			expect(hook).toHaveBeenCalled();
		});

		it('should handle errors in hooks', async () => {
			const errorHook = jest.fn().mockRejectedValue(new Error('Hook failed'));
			hooks.addHandler('nodeExecuteBefore', errorHook);

			await expect(hooks.runHook('nodeExecuteBefore', ['testNode', mock()])).rejects.toThrow(
				'Hook failed',
			);
		});
	});
});
