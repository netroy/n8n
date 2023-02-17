import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class IntercomApi implements ICredentialType {
	name = 'intercomApi';

	displayName = 'Intercom API';

	documentationUrl = 'intercom';

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
