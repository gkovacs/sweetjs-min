'use strict';Object.defineProperty(exports,'__esModule',{value:!0});var _immutable=require('immutable'),_terms=require('./terms'),_sweetSpec=require('sweet-spec'),T=_interopRequireWildcard(_sweetSpec),_scope=require('./scope'),_compiler=require('./compiler'),_compiler2=_interopRequireDefault(_compiler),_syntax=require('./syntax'),_syntax2=_interopRequireDefault(_syntax),_enforester=require('./enforester'),_templateProcessor=require('./template-processor'),_astDispatcher=require('./ast-dispatcher'),_astDispatcher2=_interopRequireDefault(_astDispatcher),_scopeReducer=require('./scope-reducer'),_scopeReducer2=_interopRequireDefault(_scopeReducer),_symbol=require('./symbol'),_transforms=require('./transforms');function _interopRequireDefault(a){return a&&a.__esModule?a:{default:a}}function _interopRequireWildcard(a){if(a&&a.__esModule)return a;var e={};if(null!=a)for(var f in a)Object.prototype.hasOwnProperty.call(a,f)&&(e[f]=a[f]);return e.default=a,e}class TermExpander extends _astDispatcher2.default{constructor(a){super('expand',!0),this.context=a}expand(a){return this.dispatch(a)}expandRawSyntax(a){return a}expandRawDelimiter(a){return a}expandTemplateExpression(a){return new T.TemplateExpression({tag:null==a.tag?null:this.expand(a.tag),elements:a.elements.toArray()})}expandBreakStatement(a){return new T.BreakStatement({label:a.label?a.label.val():null})}expandDoWhileStatement(a){return new T.DoWhileStatement({body:this.expand(a.body),test:this.expand(a.test)})}expandWithStatement(a){return new T.WithStatement({body:this.expand(a.body),object:this.expand(a.object)})}expandDebuggerStatement(a){return a}expandContinueStatement(a){return new T.ContinueStatement({label:a.label?a.label.val():null})}expandSwitchStatementWithDefault(a){return new T.SwitchStatementWithDefault({discriminant:this.expand(a.discriminant),preDefaultCases:a.preDefaultCases.map(e=>this.expand(e)).toArray(),defaultCase:this.expand(a.defaultCase),postDefaultCases:a.postDefaultCases.map(e=>this.expand(e)).toArray()})}expandComputedMemberExpression(a){return new T.ComputedMemberExpression({object:this.expand(a.object),expression:this.expand(a.expression)})}expandSwitchStatement(a){return new T.SwitchStatement({discriminant:this.expand(a.discriminant),cases:a.cases.map(e=>this.expand(e)).toArray()})}expandFormalParameters(a){let e=null==a.rest?null:this.expand(a.rest);return new T.FormalParameters({items:a.items.map(f=>this.expand(f)),rest:e})}expandArrowExpressionE(a){return this.doFunctionExpansion(a,'ArrowExpression')}expandArrowExpression(a){return this.doFunctionExpansion(a,'ArrowExpression')}expandSwitchDefault(a){return new T.SwitchDefault({consequent:a.consequent.map(e=>this.expand(e)).toArray()})}expandSwitchCase(a){return new T.SwitchCase({test:this.expand(a.test),consequent:a.consequent.map(e=>this.expand(e)).toArray()})}expandForInStatement(a){return new T.ForInStatement({left:this.expand(a.left),right:this.expand(a.right),body:this.expand(a.body)})}expandTryCatchStatement(a){return new T.TryCatchStatement({body:this.expand(a.body),catchClause:this.expand(a.catchClause)})}expandTryFinallyStatement(a){let e=null==a.catchClause?null:this.expand(a.catchClause);return new T.TryFinallyStatement({body:this.expand(a.body),catchClause:e,finalizer:this.expand(a.finalizer)})}expandCatchClause(a){return new T.CatchClause({binding:this.expand(a.binding),body:this.expand(a.body)})}expandThrowStatement(a){return new T.ThrowStatement({expression:this.expand(a.expression)})}expandForOfStatement(a){return new T.ForOfStatement({left:this.expand(a.left),right:this.expand(a.right),body:this.expand(a.body)})}expandBindingIdentifier(a){return a}expandBindingPropertyIdentifier(a){return a}expandBindingPropertyProperty(a){return new T.BindingPropertyProperty({name:this.expand(a.name),binding:this.expand(a.binding)})}expandComputedPropertyName(a){return new T.ComputedPropertyName({expression:this.expand(a.expression)})}expandObjectBinding(a){return new T.ObjectBinding({properties:a.properties.map(e=>this.expand(e)).toArray()})}expandArrayBinding(a){let e=null==a.restElement?null:this.expand(a.restElement);return new T.ArrayBinding({elements:a.elements.map(f=>null==f?null:this.expand(f)).toArray(),restElement:e})}expandBindingWithDefault(a){return new T.BindingWithDefault({binding:this.expand(a.binding),init:this.expand(a.init)})}expandShorthandProperty(a){return new T.DataProperty({name:new T.StaticPropertyName({value:a.name}),expression:new T.IdentifierExpression({name:a.name})})}expandForStatement(a){let e=null==a.init?null:this.expand(a.init),f=null==a.test?null:this.expand(a.test),g=null==a.update?null:this.expand(a.update),h=this.expand(a.body);return new T.ForStatement({init:e,test:f,update:g,body:h})}expandYieldExpression(a){let e=null==a.expression?null:this.expand(a.expression);return new T.YieldExpression({expression:e})}expandYieldGeneratorExpression(a){let e=null==a.expression?null:this.expand(a.expression);return new T.YieldGeneratorExpression({expression:e})}expandWhileStatement(a){return new T.WhileStatement({test:this.expand(a.test),body:this.expand(a.body)})}expandIfStatement(a){let e=null==a.consequent?null:this.expand(a.consequent),f=null==a.alternate?null:this.expand(a.alternate);return new T.IfStatement({test:this.expand(a.test),consequent:e,alternate:f})}expandBlockStatement(a){return new T.BlockStatement({block:this.expand(a.block)})}expandBlock(a){let e=(0,_scope.freshScope)('block');this.context.currentScope.push(e);let g,h,f=new _compiler2.default(this.context.phase,this.context.env,this.context.store,this.context);return g=a.statements.map(j=>j.reduce(new _scopeReducer2.default([{scope:e,phase:_syntax.ALL_PHASES,flip:!1}],this.context.bindings))),h=new T.Block({statements:f.compile(g)}),this.context.currentScope.pop(),h}expandVariableDeclarationStatement(a){return new T.VariableDeclarationStatement({declaration:this.expand(a.declaration)})}expandReturnStatement(a){return null==a.expression?a:new T.ReturnStatement({expression:this.expand(a.expression)})}expandClassDeclaration(a){return new T.ClassDeclaration({name:null==a.name?null:this.expand(a.name),super:null==a.super?null:this.expand(a.super),elements:a.elements.map(e=>this.expand(e)).toArray()})}expandClassExpression(a){return new T.ClassExpression({name:null==a.name?null:this.expand(a.name),super:null==a.super?null:this.expand(a.super),elements:a.elements.map(e=>this.expand(e)).toArray()})}expandClassElement(a){return new T.ClassElement({isStatic:a.isStatic,method:this.expand(a.method)})}expandThisExpression(a){return a}expandSyntaxTemplate(a){let e=(0,_templateProcessor.processTemplate)(a.template.slice(1,a.template.size-1)),f=this.context.getTemplateIdentifier();this.context.templateMap.set(f,e.template);let g=_syntax2.default.fromIdentifier('syntaxTemplate',a.template.first().value),h=new T.IdentifierExpression({name:g}),j=e.interp.map(l=>{let m=new _enforester.Enforester(l,(0,_immutable.List)(),this.context);return this.expand(m.enforest('expression'))}),k=_immutable.List.of(new T.LiteralNumericExpression({value:f})).concat(j);return new T.CallExpression({callee:h,arguments:k})}expandStaticMemberExpression(a){return new T.StaticMemberExpression({object:this.expand(a.object),property:a.property})}expandArrayExpression(a){return new T.ArrayExpression({elements:a.elements.map(e=>null==e?e:this.expand(e))})}expandImport(a){return a}expandImportNamespace(a){return a}expandExport(a){return new T.Export({declaration:this.expand(a.declaration)})}expandExportDefault(a){return new T.ExportDefault({body:this.expand(a.body)})}expandExportFrom(a){return a}expandExportAllFrom(a){return a}expandExportSpecifier(a){return a}expandStaticPropertyName(a){return a}expandDataProperty(a){return new T.DataProperty({name:this.expand(a.name),expression:this.expand(a.expression)})}expandObjectExpression(a){return new T.ObjectExpression({properties:a.properties.map(e=>this.expand(e))})}expandVariableDeclarator(a){let e=null==a.init?null:this.expand(a.init);return new T.VariableDeclarator({binding:this.expand(a.binding),init:e})}expandVariableDeclaration(a){return'syntax'===a.kind||'syntaxrec'===a.kind?a:new T.VariableDeclaration({kind:a.kind,declarators:a.declarators.map(e=>this.expand(e))})}expandParenthesizedExpression(a){if(0===a.inner.size)throw new Error('unexpected end of input');let e=new _enforester.Enforester(a.inner,(0,_immutable.List)(),this.context),f=e.peek(),g=e.enforestExpression();if(null==g||0<e.rest.size)throw e.createError(f,'unexpected syntax');return this.expand(g)}expandUnaryExpression(a){return new T.UnaryExpression({operator:a.operator,operand:this.expand(a.operand)})}expandUpdateExpression(a){return new T.UpdateExpression({isPrefix:a.isPrefix,operator:a.operator,operand:this.expand(a.operand)})}expandBinaryExpression(a){let e=this.expand(a.left),f=this.expand(a.right);return new T.BinaryExpression({left:e,operator:a.operator,right:f})}expandConditionalExpression(a){return new T.ConditionalExpression({test:this.expand(a.test),consequent:this.expand(a.consequent),alternate:this.expand(a.alternate)})}expandNewTargetExpression(a){return a}expandNewExpression(a){let e=this.expand(a.callee),f=new _enforester.Enforester(a.arguments,(0,_immutable.List)(),this.context),g=f.enforestArgumentList().map(h=>this.expand(h));return new T.NewExpression({callee:e,arguments:g.toArray()})}expandSuper(a){return a}expandCallExpressionE(a){let e=this.expand(a.callee),f=new _enforester.Enforester(a.arguments,(0,_immutable.List)(),this.context),g=f.enforestArgumentList().map(h=>this.expand(h));return new T.CallExpression({callee:e,arguments:g})}expandSpreadElement(a){return new T.SpreadElement({expression:this.expand(a.expression)})}expandExpressionStatement(a){let e=this.expand(a.expression);return new T.ExpressionStatement({expression:e})}expandLabeledStatement(a){return new T.LabeledStatement({label:a.label.val(),body:this.expand(a.body)})}doFunctionExpansion(a,e){let g,f=(0,_scope.freshScope)('fun'),h=this;'Getter'!==e&&'Setter'!==e&&(g=a.params.reduce(new class extends T.default.CloneReducer{reduceBindingIdentifier(m){let n=m.name.addScope(f,h.context.bindings,_syntax.ALL_PHASES),o=(0,_symbol.gensym)(n.val());return h.context.env.set(o.toString(),new _transforms.VarBindingTransform(n)),h.context.bindings.add(n,{binding:o,phase:h.context.phase,skipDup:!0}),new T.BindingIdentifier({name:n})}}),g=this.expand(g)),this.context.currentScope.push(f);let k,j=new _compiler2.default(this.context.phase,this.context.env,this.context.store,this.context),l=new _scopeReducer2.default([{scope:f,phase:_syntax.ALL_PHASES,flip:!1}],this.context.bindings);if(a.body instanceof T.default)k=this.expand(a.body.reduce(l));else{let m=j.compile(a.body.map(o=>o.reduce(l)));const n=m.takeWhile(o=>(0,_terms.isExpressionStatement)(o)&&(0,_terms.isLiteralStringExpression)(o.expression)).map(o=>new T.Directive({rawValue:o.expression.value}));k=new T.FunctionBody({directives:n,statements:m.slice(n.size)})}switch(this.context.currentScope.pop(),e){case'Getter':return new T.Getter({name:this.expand(a.name),body:k});case'Setter':return new T.Setter({name:this.expand(a.name),param:a.param,body:k});case'Method':return new T.Method({name:a.name,isGenerator:a.isGenerator,params:g,body:k});case'ArrowExpression':return new T.ArrowExpression({params:g,body:k});case'FunctionExpression':return new T.FunctionExpression({name:a.name,isGenerator:a.isGenerator,params:g,body:k});case'FunctionDeclaration':return new T.FunctionDeclaration({name:a.name,isGenerator:a.isGenerator,params:g,body:k});default:throw new Error(`Unknown function type: ${e}`);}}expandMethod(a){return this.doFunctionExpansion(a,'Method')}expandSetter(a){return this.doFunctionExpansion(a,'Setter')}expandGetter(a){return this.doFunctionExpansion(a,'Getter')}expandFunctionDeclarationE(a){return this.doFunctionExpansion(a,'FunctionDeclaration')}expandFunctionExpressionE(a){return this.doFunctionExpansion(a,'FunctionExpression')}expandCompoundAssignmentExpression(a){return new T.CompoundAssignmentExpression({binding:this.expand(a.binding),operator:a.operator,expression:this.expand(a.expression)})}expandAssignmentExpression(a){return new T.AssignmentExpression({binding:this.expand(a.binding),expression:this.expand(a.expression)})}expandEmptyStatement(a){return a}expandLiteralBooleanExpression(a){return a}expandLiteralNumericExpression(a){return a}expandLiteralInfinityExpression(a){return a}expandIdentifierExpression(a){let e=this.context.env.get(a.name.resolve(this.context.phase));return e?new T.IdentifierExpression({name:e.id}):a}expandLiteralNullExpression(a){return a}expandLiteralStringExpression(a){return a}expandLiteralRegExpExpression(a){return a}}exports.default=TermExpander;

