import type { INodeProperties } from '@n8n_io/nodes-sdk';

export const profileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['profile'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: "Get the user's personal information",
				action: 'Get a profile',
			},
		],
		default: 'get',
	},
];
