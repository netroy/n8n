import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class StoryblokManagementApi implements ICredentialType {
	name = 'storyblokManagementApi';

	displayName = 'Storyblok Management API';

	documentationUrl = 'storyblok';

	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
