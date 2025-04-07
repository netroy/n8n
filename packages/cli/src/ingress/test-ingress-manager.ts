import { Service } from '@n8n/di';
import type { Request, Response } from 'express';

import { AbstractIngressManager } from './abstract-ingress-manager';

@Service()
export class TestIngressManager extends AbstractIngressManager {
	handleRequest(req: Request, res: Response) {
		console.log('hello');
	}
}
