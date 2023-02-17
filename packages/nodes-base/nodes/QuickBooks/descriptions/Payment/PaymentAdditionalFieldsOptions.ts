import type { INodeProperties } from '@8n8/workflow';

export const paymentAdditionalFieldsOptions: INodeProperties[] = [
	{
		displayName: 'Transaction Date',
		name: 'TxnDate',
		description: 'Date when the transaction occurred',
		type: 'dateTime',
		default: '',
	},
];
