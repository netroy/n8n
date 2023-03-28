import type { ICredentialType, INodeProperties } from '@n8n_io/nodes-sdk';

export class ChargebeeApi implements ICredentialType {
	name = 'chargebeeApi';

	displayName = 'Chargebee API';

	documentationUrl = 'chargebee';

	properties: INodeProperties[] = [
		{
			displayName: 'Account Name',
			name: 'accountName',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Api Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
