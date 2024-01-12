import type {
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export interface NotionApiCredential {
	apiKey: string;
}

export class NotionApi implements ICredentialType {
	name = 'notionApi';

	displayName = 'Notion API';

	documentationUrl = 'notion';

	properties: INodeProperties[] = [
		{
			displayName: 'Internal Integration Secret',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.notion.com/v1',
			url: '/users/me',
		},
	};

	async authenticate(
		{ apiKey }: NotionApiCredential,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: `Bearer ${apiKey} `,
		};

		// if version it's not set, set it to last one
		// version is only set when the request is made from
		// the notion node, or was set explicitly in the http node
		if (!requestOptions.headers['Notion-Version']) {
			requestOptions.headers = {
				...requestOptions.headers,
				'Notion-Version': '2022-02-22',
			};
		}

		return requestOptions;
	}
}
