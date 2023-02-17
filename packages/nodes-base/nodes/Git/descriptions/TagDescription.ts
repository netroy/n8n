import type { INodeProperties } from '@8n8/workflow';

export const tagFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['tag'],
			},
		},
		default: '',
		description: 'The name of the tag to create',
		required: true,
	},
];
