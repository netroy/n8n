import type { ICredentialType, INodeProperties } from '@n8n_io/nodes-sdk';

export class UpleadApi implements ICredentialType {
	name = 'upleadApi';

	displayName = 'Uplead API';

	documentationUrl = 'uplead';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
