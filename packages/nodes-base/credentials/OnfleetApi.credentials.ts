import type { ICredentialType, NodePropertyTypes } from '@n8n_io/nodes-sdk';

export class OnfleetApi implements ICredentialType {
	name = 'onfleetApi';

	displayName = 'Onfleet API';

	documentationUrl = 'onfleet';

	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
