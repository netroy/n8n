import { createRunExecutionData } from 'n8n-workflow';
import type { IExecuteData, IRunExecutionData, ITaskData } from 'n8n-workflow';

import { createNodeData } from '../../partial-execution-utils/__tests__/helpers';
import { ExecutionStateManager } from '../execution-state-manager';

describe('ExecutionStateManager', () => {
	describe('constructor', () => {
		it('should reference the provided run execution data', () => {
			const runData = createEmptyRunData();
			const manager = new ExecutionStateManager(runData);

			const returnedData = manager.getRunExecutionData();
			expect(returnedData).toBe(runData); // Should be the same object reference
			expect(returnedData).toEqual(runData); // With same content
		});
	});

	describe('addTaskData', () => {
		it('should add task data to a new node', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());
			const taskData = createMockTaskData();

			manager.addTaskData('testNode', taskData);

			const resultData = manager.getRunExecutionData().resultData;
			expect(resultData.runData.testNode).toEqual([taskData]);
		});

		it('should append task data to existing node data', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());
			const taskData1 = createMockTaskData();
			const taskData2 = { ...createMockTaskData(), executionIndex: 1 };

			manager.addTaskData('testNode', taskData1);
			manager.addTaskData('testNode', taskData2);

			const resultData = manager.getRunExecutionData().resultData;
			expect(resultData.runData.testNode).toEqual([taskData1, taskData2]);
		});

		it('should handle multiple nodes independently', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());
			const taskData1 = createMockTaskData();
			const taskData2 = { ...createMockTaskData(), executionIndex: 1 };

			manager.addTaskData('node1', taskData1);
			manager.addTaskData('node2', taskData2);

			const resultData = manager.getRunExecutionData().resultData;
			expect(resultData.runData.node1).toEqual([taskData1]);
			expect(resultData.runData.node2).toEqual([taskData2]);
		});
	});

	describe('getNodeFromStack', () => {
		it('should return undefined when stack is empty', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());

			const node = manager.getNodeFromStack();

			expect(node).toBeUndefined();
		});

		it('should return and remove the first node from the stack', () => {
			const manager = new ExecutionStateManager(createRunDataWithStack());

			const node = manager.getNodeFromStack();

			expect(node).toBeDefined();
			expect(node?.node.name).toBe('testNode');
			expect(manager.hasNodesToExecute).toBe(false);
		});

		it('should remove nodes sequentially', () => {
			const runData = createRunExecutionData({
				executionData: {
					nodeExecutionStack: [
						{
							node: createNodeData({ name: 'node1', type: 'test' }),
							data: { main: [] },
							source: null,
						},
						{
							node: createNodeData({ name: 'node2', type: 'test' }),
							data: { main: [] },
							source: null,
						},
					],
					metadata: {},
				},
				resultData: {
					runData: {},
				},
			});

			const manager = new ExecutionStateManager(runData);

			const firstNode = manager.getNodeFromStack();
			expect(firstNode?.node.name).toBe('node1');
			expect(manager.hasNodesToExecute).toBe(true);

			const secondNode = manager.getNodeFromStack();
			expect(secondNode?.node.name).toBe('node2');
			expect(manager.hasNodesToExecute).toBe(false);
		});
	});

	describe('hasNodesToExecute', () => {
		it('should return false for empty stack', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());

			expect(manager.hasNodesToExecute).toBe(false);
		});

		it('should return true when stack has nodes', () => {
			const manager = new ExecutionStateManager(createRunDataWithStack());

			expect(manager.hasNodesToExecute).toBe(true);
		});

		it('should return false when stack becomes empty', () => {
			const manager = new ExecutionStateManager(createRunDataWithStack());

			manager.getNodeFromStack();

			expect(manager.hasNodesToExecute).toBe(false);
		});

		it('should handle undefined executionData gracefully', () => {
			const runData = createRunExecutionData({
				resultData: { runData: {} },
				// executionData is undefined
			});

			const manager = new ExecutionStateManager(runData);

			expect(manager.hasNodesToExecute).toBe(false);
		});
	});

	describe('lastNodeExecuted', () => {
		it('should set and get last node executed', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());

			manager.setLastNodeExecuted('testNode');

			expect(manager.getLastNodeExecuted()).toBe('testNode');
		});

		it('should return undefined when not set', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());

			expect(manager.getLastNodeExecuted()).toBeUndefined();
		});

		it('should update last node executed', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());

			manager.setLastNodeExecuted('node1');
			expect(manager.getLastNodeExecuted()).toBe('node1');

			manager.setLastNodeExecuted('node2');
			expect(manager.getLastNodeExecuted()).toBe('node2');
		});
	});

	describe('waiting state', () => {
		it('should not be waiting by default', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());

			expect(manager.isWaiting).toBe(false);
		});

		it('should set and clear waiting state', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());
			const waitDate = new Date('2024-01-01');

			manager.setWaiting(waitDate);

			expect(manager.isWaiting).toBe(true);

			manager.clearWaiting();

			expect(manager.isWaiting).toBe(false);
		});

		it('should return the correct wait date', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());
			const waitDate = new Date('2024-01-01');

			manager.setWaiting(waitDate);

			const runData = manager.getRunExecutionData();
			expect(runData.waitTill).toEqual(waitDate);
		});
	});

	describe('getRunExecutionData', () => {
		it('should return the current run execution data', () => {
			const runData = createEmptyRunData();
			const manager = new ExecutionStateManager(runData);

			const returnedData = manager.getRunExecutionData();

			expect(returnedData).toEqual(runData);
		});

		it('should reflect changes made through the manager', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());
			const taskData = createMockTaskData();

			manager.addTaskData('testNode', taskData);
			manager.setLastNodeExecuted('testNode');

			const resultData = manager.getRunExecutionData();
			expect(resultData.resultData.runData.testNode).toEqual([taskData]);
			expect(resultData.resultData.lastNodeExecuted).toBe('testNode');
		});
	});

	describe('getNodeRunData', () => {
		it('should return undefined for non-existent node', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());

			expect(manager.getNodeRunData('nonExistentNode')).toBeUndefined();
		});

		it('should return run data for existing node', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());
			const taskData = createMockTaskData();

			manager.addTaskData('testNode', taskData);

			const runData = manager.getNodeRunData('testNode');
			expect(runData).toEqual([taskData]);
		});

		it('should return readonly data', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());
			const taskData = createMockTaskData();

			manager.addTaskData('testNode', taskData);

			const runData = manager.getNodeRunData('testNode');
			expect(runData).toBeDefined();
		});
	});

	describe('hasNodeRunData', () => {
		it('should return false for non-existent node', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());

			expect(manager.hasNodeRunData('nonExistentNode')).toBe(false);
		});

		it('should return false for node with empty run data', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());

			// Simulate a node with empty array
			// @ts-expect-error private property
			Object.assign(manager.runExecutionData, {
				resultData: {
					runData: { emptyNode: [] },
				},
			});

			expect(manager.hasNodeRunData('emptyNode')).toBe(false);
		});

		it('should return true for node with run data', () => {
			const manager = new ExecutionStateManager(createEmptyRunData());
			const taskData = createMockTaskData();

			manager.addTaskData('testNode', taskData);

			expect(manager.hasNodeRunData('testNode')).toBe(true);
		});
	});

	describe('getExecutionContextData', () => {
		it('should return undefined when executionData is not set', () => {
			// Create run data with no executionData at all
			const runData = {
				version: 1 as const,
				resultData: { runData: {} },
				startData: {},
			} as IRunExecutionData;

			const manager = new ExecutionStateManager(runData);

			expect(manager.getExecutionContextData()).toBeUndefined();
		});

		it('should return execution context data when available', () => {
			const contextData = { flow: { test: 'value' } };
			const runData = createRunExecutionData({
				executionData: {
					contextData,
					nodeExecutionStack: [],
					metadata: {},
				},
				resultData: { runData: {} },
			});

			const manager = new ExecutionStateManager(runData);

			const returnedContextData = manager.getExecutionContextData();
			expect(returnedContextData).toEqual(contextData);
		});

		it('should return readonly context data', () => {
			const contextData = { flow: { test: 'value' } };
			const runData = createRunExecutionData({
				executionData: {
					contextData,
					nodeExecutionStack: [],
					metadata: {},
				},
				resultData: { runData: {} },
			});

			const manager = new ExecutionStateManager(runData);

			const returnedContextData = manager.getExecutionContextData();
			expect(returnedContextData).toBeDefined();
		});
	});
});

/**
 * Creates empty run execution data for testing.
 */
function createEmptyRunData(): IRunExecutionData {
	return createRunExecutionData({
		executionData: {
			nodeExecutionStack: [],
			metadata: {},
		},
		resultData: {
			runData: {},
		},
	});
}

/**
 * Creates run execution data with nodes in the execution stack.
 */
function createRunDataWithStack(): IRunExecutionData {
	const mockExecutionData: IExecuteData = {
		node: createNodeData({ name: 'testNode', type: 'test' }),
		data: {
			main: [[{ json: { test: 'data' } }]],
		},
		source: null,
	};

	return createRunExecutionData({
		executionData: {
			nodeExecutionStack: [mockExecutionData],
			metadata: {},
		},
		resultData: {
			runData: {},
		},
	});
}

/**
 * Creates a mock task data object for testing.
 */
function createMockTaskData(): ITaskData {
	return {
		startTime: Date.now(),
		executionIndex: 0,
		executionTime: 100,
		executionStatus: 'success',
		data: {
			main: [[{ json: { result: 'success' } }]],
		},
		source: [],
	};
}
