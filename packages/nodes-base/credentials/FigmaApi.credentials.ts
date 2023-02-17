import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class FigmaApi implements ICredentialType {
	name = 'figmaApi';

	displayName = 'Figma API';

	documentationUrl = 'figma';

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
