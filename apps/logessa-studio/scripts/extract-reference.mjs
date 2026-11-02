import fs from 'node:fs';import ts from 'typescript';
const html=fs.readFileSync('work/reference.html','utf8');
function literal(n){if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))return n.text;if(ts.isNumericLiteral(n))return Number(n.text);if(n.kind===ts.SyntaxKind.TrueKeyword)return true;if(n.kind===ts.SyntaxKind.FalseKeyword)return false;if(ts.isArrayLiteralExpression(n))return n.elements.map(literal);if(ts.isObjectLiteralExpression(n))return Object.fromEntries(n.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.text,literal(p.initializer)]));throw new Error('Nonliteral source value: '+n.getText().slice(0,40));}
let styles;
for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){const ast=ts.createSourceFile('reference.js',match[1],ts.ScriptTarget.Latest,true);function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText()==='STYLES')styles=literal(n.initializer);ts.forEachChild(n,visit);}visit(ast);}
if(!styles)throw new Error('Style archive not found');
fs.writeFileSync('lib/seasonal-reference.json',JSON.stringify({source:'logessa-kaynak-2026-10-30.zip / index.html / STYLES',sourceDate:'2026-10-30',classification:'Editorial planning assumptions; not measured demand',styles},null,2));
console.log('Extracted '+styles.length+' styles and '+styles.reduce((n,s)=>n+s.sub.length,0)+' subthemes as literal data only.');
