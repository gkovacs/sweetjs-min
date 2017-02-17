'use strict';Object.defineProperty(exports,'__esModule',{value:!0}),exports.isExportDeclaration=exports.isImportDeclaration=exports.isCompiletimeStatement=exports.isCompiletimeDeclaration=exports.isSyntaxDeclarationStatement=exports.isExportSyntax=exports.isParenthesizedExpression=exports.isFunctionWithName=exports.isFunctionTerm=exports.isSyntaxrecDeclaration=exports.isSyntaxDeclaration=exports.isEOF=exports.isVariableDeclarator=exports.isVariableDeclaration=exports.isSyntaxTemplate=exports.isTemplateElement=exports.isSwitchDefault=exports.isSwitchCase=exports.isSuper=exports.isSpreadElement=exports.isScript=exports.isFunctionDeclaration=exports.isFunctionBody=exports.isFormalParameters=exports.isDirective=exports.isCatchClause=exports.isBlock=exports.isWithStatement=exports.isWhileStatement=exports.isVariableDeclarationStatement=exports.isTryFinallyStatement=exports.isTryCatchStatement=exports.isThrowStatement=exports.isSwitchStatementWithDefault=exports.isSwitchStatement=exports.isReturnStatement=exports.isLabeledStatement=exports.isIfStatement=exports.isForStatement=exports.isForOfStatement=exports.isForInStatement=exports.isExpressionStatement=exports.isEmptyStatement=exports.isDoWhileStatement=exports.isDebuggerStatement=exports.isCompoundAssignmentExpression=exports.isContinueStatement=exports.isBreakStatement=exports.isBlockStatement=exports.isYieldGeneratorExpression=exports.isYieldExpression=exports.isUpdateExpression=exports.isThisExpression=exports.isTemplateExpression=exports.isStaticMemberExpression=exports.isUnaryExpression=exports.isObjectExpression=exports.isNewTargetExpression=exports.isNewExpression=exports.isIdentifierExpression=exports.isFunctionExpression=exports.isConditionalExpression=exports.isComputedMemberExpression=exports.isComputedAssignmentExpression=exports.isCallExpression=exports.isBinaryExpression=exports.isAssignmentExpression=exports.isArrowExpression=exports.isArrayExpression=exports.isLiteralStringExpression=exports.isLiteralRegExpExpression=exports.isLiteralNumericExpression=exports.isLiteralNullExpression=exports.isLiteralInfinityExpression=exports.isLiteralBooleanExpression=exports.isStaticPropertyName=exports.isComputedPropertyName=exports.isShorthandProperty=exports.isDataProperty=exports.isSetter=exports.isGetter=exports.isMethod=exports.isExportSpecifier=exports.isExportDefault=exports.isExport=exports.isExportFrom=exports.isExportAllFrom=exports.isImportSpecifier=exports.isImportNamespace=exports.isImport=exports.isModule=exports.isClassElement=exports.isClassDeclaration=exports.isClassExpression=exports.isBindingPropertyProperty=exports.isBindingPropertyIdentifier=exports.isObjectBinding=exports.isArrayBinding=exports.isBindingIdentifier=exports.isBindingWithDefault=void 0;var _ramda=require('ramda'),R=_interopRequireWildcard(_ramda),_sweetSpec=require('sweet-spec'),_sweetSpec2=_interopRequireDefault(_sweetSpec);function _interopRequireDefault(a){return a&&a.__esModule?a:{default:a}}function _interopRequireWildcard(a){if(a&&a.__esModule)return a;var b={};if(null!=a)for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&(b[c]=a[c]);return b.default=a,b}const isBindingWithDefault=exports.isBindingWithDefault=R.whereEq({type:'BindingWithDefault'}),isBindingIdentifier=exports.isBindingIdentifier=R.whereEq({type:'BindingIdentifier'}),isArrayBinding=exports.isArrayBinding=R.whereEq({type:'ArrayBinding'}),isObjectBinding=exports.isObjectBinding=R.whereEq({type:'ObjectBinding'}),isBindingPropertyIdentifier=exports.isBindingPropertyIdentifier=R.whereEq({type:'BindingPropertyIdentifier'}),isBindingPropertyProperty=exports.isBindingPropertyProperty=R.whereEq({type:'BindingPropertyIdentifier'}),isClassExpression=exports.isClassExpression=R.whereEq({type:'ClassExpression'}),isClassDeclaration=exports.isClassDeclaration=R.whereEq({type:'ClassDeclaration'}),isClassElement=exports.isClassElement=R.whereEq({type:'ClassElement'}),isModule=exports.isModule=R.whereEq({type:'Module'}),isImport=exports.isImport=R.whereEq({type:'Import'}),isImportNamespace=exports.isImportNamespace=R.whereEq({type:'ImportNamespace'}),isImportSpecifier=exports.isImportSpecifier=R.whereEq({type:'ImportSpecifier'}),isExportAllFrom=exports.isExportAllFrom=R.whereEq({type:'ExportAllFrom'}),isExportFrom=exports.isExportFrom=R.whereEq({type:'ExportFrom'}),isExport=exports.isExport=R.whereEq({type:'Export'}),isExportDefault=exports.isExportDefault=R.whereEq({type:'ExportDefault'}),isExportSpecifier=exports.isExportSpecifier=R.whereEq({type:'ExportSpecifier'}),isMethod=exports.isMethod=R.whereEq({type:'Method'}),isGetter=exports.isGetter=R.whereEq({type:'Getter'}),isSetter=exports.isSetter=R.whereEq({type:'Setter'}),isDataProperty=exports.isDataProperty=R.whereEq({type:'DataProperty'}),isShorthandProperty=exports.isShorthandProperty=R.whereEq({type:'ShorthandProperty'}),isComputedPropertyName=exports.isComputedPropertyName=R.whereEq({type:'ComputedPropertyName'}),isStaticPropertyName=exports.isStaticPropertyName=R.whereEq({type:'StaticPropertyName'}),isLiteralBooleanExpression=exports.isLiteralBooleanExpression=R.whereEq({type:'LiteralBooleanExpression'}),isLiteralInfinityExpression=exports.isLiteralInfinityExpression=R.whereEq({type:'LiteralInfinityExpression'}),isLiteralNullExpression=exports.isLiteralNullExpression=R.whereEq({type:'LiteralNullExpression'}),isLiteralNumericExpression=exports.isLiteralNumericExpression=R.whereEq({type:'LiteralNumericExpression'}),isLiteralRegExpExpression=exports.isLiteralRegExpExpression=R.whereEq({type:'LiteralRegExpExpression'}),isLiteralStringExpression=exports.isLiteralStringExpression=R.whereEq({type:'LiteralStringExpression'}),isArrayExpression=exports.isArrayExpression=R.whereEq({type:'ArrayExpression'}),isArrowExpression=exports.isArrowExpression=R.whereEq({type:'ArrowExpression'}),isAssignmentExpression=exports.isAssignmentExpression=R.whereEq({type:'AssignmentExpression'}),isBinaryExpression=exports.isBinaryExpression=R.whereEq({type:'BinaryExpression'}),isCallExpression=exports.isCallExpression=R.whereEq({type:'CallExpression'}),isComputedAssignmentExpression=exports.isComputedAssignmentExpression=R.whereEq({type:'ComputedAssignmentExpression'}),isComputedMemberExpression=exports.isComputedMemberExpression=R.whereEq({type:'ComputedMemberExpression'}),isConditionalExpression=exports.isConditionalExpression=R.whereEq({type:'ConditionalExpression'}),isFunctionExpression=exports.isFunctionExpression=R.whereEq({type:'FunctionExpression'}),isIdentifierExpression=exports.isIdentifierExpression=R.whereEq({type:'IdentifierExpression'}),isNewExpression=exports.isNewExpression=R.whereEq({type:'NewExpression'}),isNewTargetExpression=exports.isNewTargetExpression=R.whereEq({type:'NewTargetExpression'}),isObjectExpression=exports.isObjectExpression=R.whereEq({type:'ObjectExpression'}),isUnaryExpression=exports.isUnaryExpression=R.whereEq({type:'UnaryExpression'}),isStaticMemberExpression=exports.isStaticMemberExpression=R.whereEq({type:'StaticMemberExpression'}),isTemplateExpression=exports.isTemplateExpression=R.whereEq({type:'TemplateExpression'}),isThisExpression=exports.isThisExpression=R.whereEq({type:'ThisExpression'}),isUpdateExpression=exports.isUpdateExpression=R.whereEq({type:'UpdateExpression'}),isYieldExpression=exports.isYieldExpression=R.whereEq({type:'YieldExpression'}),isYieldGeneratorExpression=exports.isYieldGeneratorExpression=R.whereEq({type:'YieldGeneratorExpression'}),isBlockStatement=exports.isBlockStatement=R.whereEq({type:'BlockStatement'}),isBreakStatement=exports.isBreakStatement=R.whereEq({type:'BreakStatement'}),isContinueStatement=exports.isContinueStatement=R.whereEq({type:'ContinueStatement'}),isCompoundAssignmentExpression=exports.isCompoundAssignmentExpression=R.whereEq({type:'CompoundAssignmentExpression'}),isDebuggerStatement=exports.isDebuggerStatement=R.whereEq({type:'DebuggerStatement'}),isDoWhileStatement=exports.isDoWhileStatement=R.whereEq({type:'DoWhileStatement'}),isEmptyStatement=exports.isEmptyStatement=R.whereEq({type:'EmptyStatement'}),isExpressionStatement=exports.isExpressionStatement=R.whereEq({type:'ExpressionStatement'}),isForInStatement=exports.isForInStatement=R.whereEq({type:'ForInStatement'}),isForOfStatement=exports.isForOfStatement=R.whereEq({type:'ForOfStatement'}),isForStatement=exports.isForStatement=R.whereEq({type:'ForStatement'}),isIfStatement=exports.isIfStatement=R.whereEq({type:'IfStatement'}),isLabeledStatement=exports.isLabeledStatement=R.whereEq({type:'LabeledStatement'}),isReturnStatement=exports.isReturnStatement=R.whereEq({type:'ReturnStatement'}),isSwitchStatement=exports.isSwitchStatement=R.whereEq({type:'SwitchStatement'}),isSwitchStatementWithDefault=exports.isSwitchStatementWithDefault=R.whereEq({type:'SwitchStatementWithDefault'}),isThrowStatement=exports.isThrowStatement=R.whereEq({type:'ThrowStatement'}),isTryCatchStatement=exports.isTryCatchStatement=R.whereEq({type:'TryCatchStatement'}),isTryFinallyStatement=exports.isTryFinallyStatement=R.whereEq({type:'TryFinallyStatement'}),isVariableDeclarationStatement=exports.isVariableDeclarationStatement=R.whereEq({type:'VariableDeclarationStatement'}),isWhileStatement=exports.isWhileStatement=R.whereEq({type:'WhileStatement'}),isWithStatement=exports.isWithStatement=R.whereEq({type:'WithStatement'}),isBlock=exports.isBlock=R.whereEq({type:'Block'}),isCatchClause=exports.isCatchClause=R.whereEq({type:'CatchClause'}),isDirective=exports.isDirective=R.whereEq({type:'Directive'}),isFormalParameters=exports.isFormalParameters=R.whereEq({type:'FormalParameters'}),isFunctionBody=exports.isFunctionBody=R.whereEq({type:'FunctionBody'}),isFunctionDeclaration=exports.isFunctionDeclaration=R.whereEq({type:'FunctionDeclaration'}),isScript=exports.isScript=R.whereEq({type:'Script'}),isSpreadElement=exports.isSpreadElement=R.whereEq({type:'SpreadElement'}),isSuper=exports.isSuper=R.whereEq({type:'Super'}),isSwitchCase=exports.isSwitchCase=R.whereEq({type:'SwitchCase'}),isSwitchDefault=exports.isSwitchDefault=R.whereEq({type:'SwitchDefault'}),isTemplateElement=exports.isTemplateElement=R.whereEq({type:'TemplateElement'}),isSyntaxTemplate=exports.isSyntaxTemplate=R.whereEq({type:'SyntaxTemplate'}),isVariableDeclaration=exports.isVariableDeclaration=R.whereEq({type:'VariableDeclaration'}),isVariableDeclarator=exports.isVariableDeclarator=R.whereEq({type:'VariableDeclarator'}),isEOF=exports.isEOF=R.whereEq({type:'EOF'}),isSyntaxDeclaration=exports.isSyntaxDeclaration=R.both(isVariableDeclaration,R.whereEq({kind:'syntax'})),isSyntaxrecDeclaration=exports.isSyntaxrecDeclaration=R.both(isVariableDeclaration,R.whereEq({kind:'syntaxrec'})),isFunctionTerm=exports.isFunctionTerm=R.either(isFunctionDeclaration,isFunctionExpression),isFunctionWithName=exports.isFunctionWithName=R.and(isFunctionTerm,R.complement(R.where({name:R.isNil}))),isParenthesizedExpression=exports.isParenthesizedExpression=R.whereEq({type:'ParenthesizedExpression'}),isExportSyntax=exports.isExportSyntax=R.both(isExport,a=>R.or(isSyntaxDeclaration(a.declaration),isSyntaxrecDeclaration(a.declaration))),isSyntaxDeclarationStatement=exports.isSyntaxDeclarationStatement=R.both(isVariableDeclarationStatement,a=>isCompiletimeDeclaration(a.declaration)),isCompiletimeDeclaration=exports.isCompiletimeDeclaration=R.either(isSyntaxDeclaration,isSyntaxrecDeclaration),isCompiletimeStatement=exports.isCompiletimeStatement=a=>{return a instanceof _sweetSpec2.default&&isVariableDeclarationStatement(a)&&isCompiletimeDeclaration(a.declaration)},isImportDeclaration=exports.isImportDeclaration=R.either(isImport,isImportNamespace),isExportDeclaration=exports.isExportDeclaration=R.either(isExport,isExportDefault,isExportFrom,isExportAllFrom);

