import { mock } from 'jest-mock-extended';
import type {
	IExecuteResponsePromiseData,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	ITaskStartedData,
} from 'n8n-workflow';

import type {
	ExecutionLifecycleHookName,
	ExecutionLifecycleHookHandlers,
	HookExecutionContext,
} from '../execution-lifecycle-hooks';
import { ExecutionLifecycleHooks } from '../execution-lifecycle-hooks';

describe('ExecutionLifecycleHooks', () => {
	const executionId = '123';
	const context: HookExecutionContext = {
		executionId,
		executionMode: 'internal',
		workflowData: mock(),
		saveSettings: mock(),
	};

	let hooks: ExecutionLifecycleHooks;
	beforeEach(() => {
		jest.clearAllMocks();
		hooks = new ExecutionLifecycleHooks();
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
			hookName: ExecutionLifecycleHookName;
			args: Parameters<
				ExecutionLifecycleHookHandlers[keyof ExecutionLifecycleHookHandlers][number]
			>;
		}> = [
			{ hookName: 'nodeExecuteBefore', args: [context, 'testNode', mock<ITaskStartedData>()] },
			{
				hookName: 'nodeExecuteAfter',
				args: [context, 'testNode', mock<ITaskData>(), mock<IRunExecutionData>()],
			},
			{
				hookName: 'workflowExecuteBefore',
				args: [context],
			},
			{ hookName: 'workflowExecuteAfter', args: [context, mock<IRun>()] },
			{ hookName: 'sendResponse', args: [context, mock<IExecuteResponsePromiseData>()] },
			{ hookName: 'nodeFetchedData', args: [context, mock<INode>()] },
		];

		test.each(testCases)(
			'should add handlers to $hook hook and call them',
			async ({ hookName, args }) => {
				const handler = hooksHandlers[hookName];
				hooks.addHandler(hookName, handler);
				const runHook = hooks.withContext(context);
				await runHook(hookName, args);
				// eslint-disable-next-line n8n-local-rules/no-argument-spread
				expect(handler).toHaveBeenCalledWith(expect.anything(), ...args);
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
			const runHook = hooks.withContext(context);
			await runHook('nodeExecuteBefore', ['testNode', mock()]);

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
			const runHook = hooks.withContext(context);
			await runHook('nodeExecuteBefore', ['testNode', mock()]);

			expect(hook).toHaveBeenCalled();
		});

		it('should handle errors in hooks', async () => {
			const errorHook = jest.fn().mockRejectedValue(new Error('Hook failed'));
			hooks.addHandler('nodeExecuteBefore', errorHook);

			const runHook = hooks.withContext(context);
			await expect(runHook('nodeExecuteBefore', ['testNode', mock()])).rejects.toThrow(
				'Hook failed',
			);
		});
	});
});
