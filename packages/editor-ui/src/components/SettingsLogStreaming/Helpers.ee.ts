import { INodeCredentials, INodeParameters, MessageEventBusDestinationOptions } from '@8n8/workflow';
import { INodeUi } from '../../Interface';

export function destinationToFakeINodeUi(
	destination: MessageEventBusDestinationOptions,
	fakeType = '@8n8/nodes-base.stickyNote',
): INodeUi {
	return {
		id: destination.id,
		name: destination.id,
		typeVersion: 1,
		type: fakeType,
		position: [0, 0],
		credentials: {
			...(destination.credentials as INodeCredentials),
		},
		parameters: {
			...(destination as unknown as INodeParameters),
		},
	} as INodeUi;
}
