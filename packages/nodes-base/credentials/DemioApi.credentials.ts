import type { ICredentialType, INodeProperties } from '@n8n_io/nodes-sdk';

export class DemioApi implements ICredentialType {
	name = 'demioApi';

	displayName = 'Demio API';

	documentationUrl = 'demio';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			default: '',
		},
	];
}
