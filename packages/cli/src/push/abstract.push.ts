import { Service } from 'typedi';
import { isProxy } from 'util/types';
import { type Readable } from 'stream';
import { EventEmitter } from 'events';
import { JsonStreamStringify } from 'json-stream-stringify';
import type { IPushDataType } from '@/Interfaces';
import { Logger } from '@/Logger';
import type { User } from '@db/entities/User';

const skipProxies = (_: string, value: unknown) =>
	value && isProxy(value) ? JSON.stringify(value) : value;

/**
 * Abstract class for two-way push communication.
 * Keeps track of user sessions and enables sending messages.
 *
 * @emits message when a message is received from a client
 */
@Service()
export abstract class AbstractPush<T> extends EventEmitter {
	protected connections: Record<string, T> = {};

	protected userIdBySessionId: Record<string, string> = {};

	protected abstract close(connection: T): void;
	protected abstract sendTo(clients: T[], stream: Readable): Promise<void>;
	protected abstract pingAll(): void;

	private messageQueue: Array<[T[], Readable]> = [];

	constructor(protected readonly logger: Logger) {
		super();
		// Ping all connected clients every 60 seconds
		setInterval(() => this.pingAll(), 60 * 1000);
	}

	protected add(sessionId: string, userId: User['id'], connection: T): void {
		const { connections, userIdBySessionId: userIdsBySessionId } = this;
		this.logger.debug('Add editor-UI session', { sessionId });

		const existingConnection = connections[sessionId];
		if (existingConnection) {
			// Make sure to remove existing connection with the same id
			this.close(existingConnection);
		}

		connections[sessionId] = connection;
		userIdsBySessionId[sessionId] = userId;
	}

	protected onMessageReceived(sessionId: string, msg: unknown): void {
		this.logger.debug('Received message from editor-UI', { sessionId, msg });
		const userId = this.userIdBySessionId[sessionId];
		this.emit('message', {
			sessionId,
			userId,
			msg,
		});
	}

	protected remove(sessionId: string): void {
		this.logger.debug('Remove editor-UI session', { sessionId });
		delete this.connections[sessionId];
		delete this.userIdBySessionId[sessionId];
	}

	broadcast<D>(type: IPushDataType, data?: D) {
		return this.enqueue(Object.values(this.connections), type, data);
	}

	send<D>(type: IPushDataType, data: D, sessionId: string) {
		const { connections } = this;
		const connection = connections[sessionId];
		if (connection === undefined) {
			this.logger.error(`The session "${sessionId}" is not registered.`, { sessionId });
			return;
		}

		this.enqueue([connection], type, data);
	}

	/** Sends the given data to given users' connections */
	sendToUsers<D>(type: IPushDataType, data: D, userIds: Array<User['id']>) {
		const { connections } = this;
		const userSessionIds = Object.keys(connections).filter((sessionId) =>
			userIds.includes(this.userIdBySessionId[sessionId]),
		);

		this.logger.debug(`Send data of type "${type}" to editor-UI`, {
			dataType: type,
			sessionIds: userSessionIds.join(', '),
		});

		this.enqueue(
			userSessionIds.map((sessionId) => connections[sessionId]),
			type,
			data,
		);
	}

	/** Closes all push existing connections */
	closeAllConnections() {
		for (const sessionId in this.connections) {
			// Signal the connection that we want to close it.
			// We are not removing the sessions here because it should be
			// the implementation's responsibility to do so once the connection
			// has actually closed.
			this.close(this.connections[sessionId]);
		}
	}

	private enqueue<D>(clients: T[], type: IPushDataType, data?: D) {
		const stream = new JsonStreamStringify({ type, data }, skipProxies, undefined, true);
		this.messageQueue.push([clients, stream]);
		setImmediate(async () => this.processQueue());
	}

	private async processQueue() {
		while (this.messageQueue.length) {
			const [clients, stream] = this.messageQueue.shift()!;
			await this.sendTo(clients, stream);
		}
	}
}
