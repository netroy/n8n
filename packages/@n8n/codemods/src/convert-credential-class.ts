import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Project, SyntaxKind, type ObjectLiteralExpression } from 'ts-morph';

function runBiomeFormat(filePath: string) {
	try {
		childProcess.execSync(`pnpm biome format --write "${filePath}"`, {
			stdio: 'ignore',
		});
	} catch {
		// Ignore errors
	}
}

interface ParsedProperty {
	name: string;
	displayName: string;
	type: string;
	default?: string | number | boolean | null;
	required?: boolean;
	description?: string;
	hint?: string;
	placeholder?: string;
	typeOptions?: Record<string, unknown>;
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
}

function parseProperty(propObj: ObjectLiteralExpression): ParsedProperty | null {
	const properties = propObj.getProperties();

	let name = '';
	let type = 'string';
	let defaultValue: string | number | boolean | null | undefined;
	let displayName: string | undefined;
	let description: string | undefined;
	let hint: string | undefined;
	let placeholder: string | undefined;
	let required: boolean | undefined;
	let typeOptionsText: string | undefined;

	for (const p of properties) {
		if (!p.isKind(SyntaxKind.PropertyAssignment)) continue;

		const propName = p.getName();
		const init = p.getInitializer();
		if (!init) continue;

		switch (propName) {
			case 'name':
				name = init.getText().replace(/['"]/g, '');
				break;
			case 'type':
				type = init.getText().replace(/['"]/g, '') || 'string';
				break;
			case 'default':
				defaultValue = init.getText();
				break;
			case 'displayName':
				displayName = init.getText();
				break;
			case 'description':
				description = init.getText();
				break;
			case 'hint':
				hint = init.getText();
				break;
			case 'placeholder':
				placeholder = init.getText();
				break;
			case 'required':
				required = init.getText() === 'true';
				break;
			case 'typeOptions':
				typeOptionsText = init.getText();
				break;
		}
	}

	if (!name) return null;

	return {
		name,
		displayName: displayName ?? name,
		type,
		default: defaultValue,
		required,
		description,
		hint,
		placeholder,
		typeOptions: typeOptionsText ? { raw: typeOptionsText } : undefined,
	};
}

function isNewFormat(filePath: string): boolean {
	const project = new Project({ skipFileDependencyResolution: true });
	const sourceFile = project.addSourceFileAtPath(filePath);

	for (const classDecl of sourceFile.getClasses()) {
		const extendsClause = classDecl.getExtends();
		if (extendsClause) {
			const text = extendsClause.getText();
			if (text.includes('Credential(')) {
				return true;
			}
		}
	}

	return false;
}

function convertPropertyToZodField(prop: ParsedProperty): string {
	let zodChain = mapTypeZod(prop.type);

	if (prop.default !== undefined) {
		zodChain += `.default(${prop.default})`;
	} else if (prop.required !== true) {
		zodChain += `.optional()`;
	}

	const metaFields: string[] = [];

	if (prop.displayName && prop.displayName !== prop.name) {
		metaFields.push(`displayName: ${prop.displayName}`);
	}
	if (prop.description) {
		metaFields.push(`description: ${prop.description}`);
	}
	if (prop.hint) {
		metaFields.push(`hint: ${prop.hint}`);
	}
	if (prop.placeholder) {
		metaFields.push(`placeholder: ${prop.placeholder}`);
	}
	if (prop.typeOptions?.raw) {
		metaFields.push(`typeOptions: ${prop.typeOptions.raw}`);
	}

	if (metaFields.length > 0) {
		zodChain += `.meta({\n\t\t${metaFields.join(',\n\t\t')}\n\t})`;
	}

	return `\t${prop.name}: ${zodChain}`;
}

function mapTypeZod(type: string): string {
	switch (type) {
		case 'string':
		case 'password':
			return 'z.string()';
		case 'number':
			return 'z.number()';
		case 'boolean':
			return 'z.boolean()';
		case 'options':
			return 'z.string()';
		case 'json':
			return 'z.record(z.unknown())';
		case 'hidden':
			return 'z.string()';
		default:
			return 'z.string()';
	}
}

export async function runConvertCredentialClass(filePath: string, apply: boolean) {
	console.log('🔍 Converting credential class to zod schema\n');
	console.log(`Mode: ${apply ? 'APPLY CHANGES' : 'DRY RUN (no changes)'}\n`);

	if (!fs.existsSync(filePath)) {
		console.error(`Error: File does not exist: ${filePath}`);
		process.exit(1);
	}

	if (!filePath.endsWith('.credentials.ts')) {
		console.error(`Error: File must end with .credentials.ts: ${filePath}`);
		process.exit(1);
	}

	if (isNewFormat(filePath)) {
		const relativePath = path.relative(process.cwd(), filePath);
		console.log(`${relativePath} - already in new format`);
		return;
	}

	const project = new Project({ skipFileDependencyResolution: true });
	const sourceFile = project.addSourceFileAtPath(filePath);

	const classDecl = sourceFile.getClasses().find((c) => c.getName() !== undefined);
	if (!classDecl) {
		console.error(`Error: No class found in ${filePath}`);
		process.exit(1);
	}

	const className = classDecl.getName() ?? 'Unknown';

	const properties: ParsedProperty[] = [];
	const propertiesProp = classDecl.getProperty('properties');
	if (propertiesProp) {
		const init = propertiesProp.getInitializer();
		if (init?.getKind() === SyntaxKind.ArrayLiteralExpression) {
			const elements = init.asKindOrThrow(SyntaxKind.ArrayLiteralExpression).getElements();
			for (const elem of elements) {
				if (elem.getKind() === SyntaxKind.ObjectLiteralExpression) {
					const obj = elem.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
					const prop = parseProperty(obj);
					if (prop) properties.push(prop);
				}
			}
		}
	}

	const zodFields = properties
		.filter((p) => p.type !== 'hidden')
		.map((prop) => convertPropertyToZodField(prop))
		.join(',\n  ');

	// const statementsToInsert = [];
	if (properties.length) {
		const schemaDeclaration = `const ${className}Schema = z.object({\n  ${zodFields}\n});`;
		const typeExport = `export type ${className}Credential = z.infer<typeof ${className}Schema>;`;
		// statementsToInsert.push(`${schemaDeclaration}\n\n${typeExport}\n`)

		const childIndex = classDecl.getChildIndex();
		sourceFile.insertStatements(childIndex, [schemaDeclaration, '\n', typeExport, '\n']);
	}

	if (
		!sourceFile.getImportDeclaration((imp) => imp.getModuleSpecifier().getText().includes('zod/v4'))
	) {
		sourceFile.addImportDeclaration({
			moduleSpecifier: 'zod/v4',
			defaultImport: 'z',
		});
	}

	let hasCredentialImport = false;
	for (const imp of sourceFile.getImportDeclarations()) {
		if (imp.getModuleSpecifier().getText().includes('n8n-workflow')) {
			const namedImports = imp.getNamedImports();
			if (namedImports.some((ni) => ni.getName() === 'CredentialClass')) {
				hasCredentialImport = true;
				break;
			}
		}
	}

	if (!hasCredentialImport) {
		sourceFile.addImportDeclaration({
			moduleSpecifier: 'n8n-workflow',
			namedImports: ['CredentialClass'],
		});
	}

	for (const imp of sourceFile.getImportDeclarations()) {
		if (imp.getModuleSpecifier().getText().includes('n8n-workflow')) {
			const namedImports = imp.getNamedImports();
			const inNodeProperties = namedImports.find((ni) => ni.getName() === 'INodeProperties');
			if (inNodeProperties) {
				inNodeProperties.remove();
			}
		}
	}

	classDecl.setExtends(`CredentialClass.fromSchema(${className}Schema)`);

	if (!classDecl.getImplements()) {
		const classText = classDecl.getText();
		const newClassText = classText.replace(
			/^export class (\w+)/,
			'export class $1 implements ICredentialType',
		);
		classDecl.replaceWithText(newClassText);
	}

	if (propertiesProp) {
		propertiesProp.remove();
	}

	const relativePath = path.relative(process.cwd(), filePath);
	console.log(`📝 ${relativePath}`);

	if (apply) {
		sourceFile.saveSync();
		runBiomeFormat(filePath);
		console.log(`  ✓ Updated ${relativePath}`);
	} else {
		console.log(`\n💡 Run with --apply to apply changes`);
	}
}
