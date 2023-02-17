import type { ICredentialType, NodePropertyTypes } from '@8n8/workflow';

export class NetlifyApi implements ICredentialType {
	name = 'netlifyApi';

	displayName = 'Netlify API';

	documentationUrl = 'netlify';

	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
