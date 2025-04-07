import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import type { IngressType, Handler } from './types';

@Service()
export abstract class AbstractIngressManager {
	private readonly handlers: Record<IngressType, Record<string, Handler>> = {
		sse: {},
		websocket: {},
	};

	registerHandler(ingressPath: string, ingressType: IngressType, handler: Handler) {
		const handlers = this.handlers[ingressType];
		if (ingressPath in handlers) {
			throw new UserError('This ingress path is already taken');
		}
		handlers[ingressPath] = handler;
	}
}
