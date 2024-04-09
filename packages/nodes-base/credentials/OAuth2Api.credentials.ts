import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import { options } from '@utils/dsl';

const properties = [
	options('grantType', 'Grant Type', 'authorizationCode').values({
		authorizationCode: 'Authorization Code',
		clientCredentials: 'Client Credentials',
		pkce: 'PKCE',
	}),
];

export class OAuth2Api implements ICredentialType {
	name = 'oAuth2Api';

	displayName = 'OAuth2 API';

	documentationUrl = 'httpRequest';

	genericAuth = true;

	properties: INodeProperties[] = [
		...properties.map((p) => p.toNodeProperty()),
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			displayOptions: {
				show: {
					grantType: ['authorizationCode', 'pkce'],
				},
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'string',
			displayOptions: {
				show: {
					grantType: ['authorizationCode', 'pkce'],
				},
			},
			default: '',
			description:
				'For some services additional query parameters have to be set which can be defined here',
			placeholder: 'access_type=offline',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Body',
					value: 'body',
					description: 'Send credentials in body',
				},
				{
					name: 'Header',
					value: 'header',
					description: 'Send credentials as Basic Auth header',
				},
			],
			default: 'header',
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'ignoreSSLIssues',
			type: 'boolean',
			default: false,
			doNotInherit: true,
		},
	];
}
