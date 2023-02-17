import type { IExecuteFunctions } from '@8n8/core';
import type { INodeExecutionData, INodeType, INodeTypeDescription } from '@8n8/workflow';

export class Start implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Start',
		name: 'start',
		icon: 'fa:play',
		group: ['input'],
		version: 1,
		description: 'Starts the workflow execution from this node',
		maxNodes: 1,
		hidden: true,
		defaults: {
			name: 'Start',
			color: '#00e000',
		},
		// eslint-disable-next-line @8n8/nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName:
					'This node is where a manual workflow execution starts. To make one, go back to the canvas and click ‘execute workflow’',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return this.prepareOutputData(items);
	}
}
