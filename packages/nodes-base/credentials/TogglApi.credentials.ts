import type { ICredentialType, INodeProperties } from '@8n8/workflow';

export class TogglApi implements ICredentialType {
	name = 'togglApi';

	displayName = 'Toggl API';

	documentationUrl = 'toggl';

	properties: INodeProperties[] = [
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
			typeOptions: { password: true },
			default: '',
		},
	];
}
