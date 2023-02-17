import { WorkflowExecute } from '@8n8/core';
import { createDeferredPromise, INodeTypes, IRun, Workflow } from '@8n8/workflow';
import * as Helpers from './Helpers';
import type { WorkflowTestData } from './types';

export async function executeWorkflow(testData: WorkflowTestData, nodeTypes: INodeTypes) {
	const executionMode = 'manual';
	const workflowInstance = new Workflow({
		id: 'test',
		nodes: testData.input.workflowData.nodes,
		connections: testData.input.workflowData.connections,
		active: false,
		nodeTypes,
	});

	const waitPromise = await createDeferredPromise<IRun>();
	const nodeExecutionOrder: string[] = [];
	const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise, nodeExecutionOrder);

	const workflowExecute = new WorkflowExecute(additionalData, executionMode);

	const executionData = await workflowExecute.run(workflowInstance);
	const result = await waitPromise.promise();
	return { executionData, result, nodeExecutionOrder };
}
