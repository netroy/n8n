import type { ICredentialType, INodeProperties } from '@n8n_io/nodes-sdk';

export class FormstackApi implements ICredentialType {
	name = 'formstackApi';

	displayName = 'Formstack API';

	documentationUrl = 'formstackTrigger';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
