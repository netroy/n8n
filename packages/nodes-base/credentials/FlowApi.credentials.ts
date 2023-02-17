import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class FlowApi implements ICredentialType {
	name = 'flowApi';

	displayName = 'Flow API';

	documentationUrl = 'flow';

	properties: INodeProperties[] = [
		{
			displayName: 'Organization ID',
			name: 'organizationId',
			type: 'number',
			default: 0,
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
