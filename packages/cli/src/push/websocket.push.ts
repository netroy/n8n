import type { Readable } from 'stream';
import type WebSocket from 'ws';
import { Service } from 'typedi';
import { AbstractPush } from './abstract.push';
import type { User } from '@db/entities/User';

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

const EMPTY_BUFFER = Buffer.alloc(0);

@Service()
export class WebSocketPush extends AbstractPush<WebSocket> {
	add(sessionId: string, userId: User['id'], connection: WebSocket) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);

		super.add(sessionId, userId, connection);

		const onMessage = (data: WebSocket.RawData) => {
			try {
				const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);

				this.onMessageReceived(sessionId, JSON.parse(buffer.toString('utf8')));
			} catch (error) {
				this.logger.error("Couldn't parse message from editor-UI", {
					error: error as unknown,
					sessionId,
					data,
				});
			}
		};

		// Makes sure to remove the session if the connection is closed
		connection.once('close', () => {
			connection.off('pong', heartbeat);
			connection.off('message', onMessage);
			this.remove(sessionId);
		});

		connection.on('message', onMessage);
	}

	protected close(connection: WebSocket): void {
		connection.close();
	}

	protected async sendTo(connections: WebSocket[], stream: Readable) {
		await new Promise<void>((resolve, reject) => {
			stream
				.once('error', reject)
				.on('data', (chunk: Buffer) => {
					connections.forEach((connection) => connection.send(chunk, { fin: false }));
				})
				.once('end', () => {
					connections.forEach((connection) => connection.send(EMPTY_BUFFER));
					resolve();
				});
		});
	}

	protected pingAll() {
		for (const sessionId in this.connections) {
			const connection = this.connections[sessionId];
			// If a connection did not respond with a `PONG` in the last 60 seconds, disconnect
			if (!connection.isAlive) {
				delete this.connections[sessionId];
				return connection.terminate();
			}

			connection.isAlive = false;
			connection.ping();
		}
	}
}
