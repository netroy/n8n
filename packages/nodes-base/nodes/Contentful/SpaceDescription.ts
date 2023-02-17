import type { INodeProperties } from '@8n8/workflow';

export const resource = {
	name: 'Space',
	value: 'space',
};

export const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [resource.value],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		default: 'get',
	},
];

export const fields: INodeProperties[] = [];
