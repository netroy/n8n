import type { ICredentialType, INodeProperties } from '@8n8/workflow';

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
