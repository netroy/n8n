import type { IExecuteFunctions } from '@8n8/core';
import type { INodeExecutionData, INodeType, INodeTypeDescription } from '@8n8/workflow';

export class StickyNote implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sticky Note',
		name: 'stickyNote',
		icon: 'fa:sticky-note',
		group: ['input'],
		version: 1,
		description: 'Make your workflow easier to understand',
		defaults: {
			name: 'Sticky Note',
			color: '#FFD233',
		},
		// eslint-disable-next-line @8n8/nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line @8n8/nodes-base/node-class-description-outputs-wrong
		outputs: [],
		properties: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				required: true,
				default:
					"## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/sticky-notes/)",
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				required: true,
				default: 160,
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				required: true,
				default: 240,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return this.prepareOutputData(items);
	}
}
