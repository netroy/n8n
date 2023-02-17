import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class HttpDigestAuth implements ICredentialType {
	name = 'httpDigestAuth';

	displayName = 'Digest Auth';

	documentationUrl = 'httpRequest';

	genericAuth = true;

	icon = 'node:@8n8/nodes-base.httpRequest';

	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
