import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from '@8n8/workflow';

export class MauticApi implements ICredentialType {
	name = 'mauticApi';

	displayName = 'Mautic API';

	documentationUrl = 'mautic';

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://name.mautic.net',
		},
		{
			displayName: 'Username',
			name: 'username',
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

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url.replace(new RegExp("/$"), "")}}',
			url: '/api/users/self',
		},
	};
}
