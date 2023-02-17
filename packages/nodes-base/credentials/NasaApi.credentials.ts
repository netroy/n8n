import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class NasaApi implements ICredentialType {
	name = 'nasaApi';

	displayName = 'NASA API';

	documentationUrl = 'nasa';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'api_key',
			type: 'string',
			default: '',
		},
	];
}
