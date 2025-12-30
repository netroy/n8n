#!/usr/bin/env node
import { runConvertCredentialClass } from './convert-credential-class';

const args = process.argv.slice(2);
const command = args[0];

if (args.length === 0 || args.includes('--help')) {
	console.log(`
n8n Codemods

Usage: @n8n/codemods <command> [options]

Commands:
  convert-credential-class  Convert a credential class to zod-based schema

Options:
  --help           Show this help message
  --apply          Apply changes (default is dry run)

Examples:
  # Preview conversion
  npx @n8n/codemods convert-credential-class ./credentials/Amqp.credentials.ts

  # Apply changes
  npx @n8n/codemods convert-credential-class ./credentials/Amqp.credentials.ts --apply
`);
	process.exit();
}

async function main() {
	if (command === 'convert-credential-class') {
		let apply = false;
		let filePath = '';

		args.forEach((arg) => {
			if (arg === '--apply') {
				apply = true;
			} else if (!arg.startsWith('-')) {
				filePath = arg;
			}
		});

		if (!filePath) {
			console.error('Error: Missing file path');
			console.error('Run --help for usage information');
			process.exit(1);
		}

		await runConvertCredentialClass(filePath, apply);
		return;
	}

	console.error(`Error: Unknown command: ${command}`);
	console.error('Run --help for usage information');
	process.exit(1);
}

main().catch(console.error);
