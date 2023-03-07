import type { ICredentialType, INodeProperties } from '@n8n_io/nodes-sdk';

export class SyncroMspApi implements ICredentialType {
	name = 'syncroMspApi';

	displayName = 'SyncroMSP API';

	documentationUrl = 'syncromsp';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
		},
	];
}
