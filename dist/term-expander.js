'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _immutable = require('immutable');

var _terms = require('./terms');

var _sweetSpec = require('sweet-spec');

var T = _interopRequireWildcard(_sweetSpec);

var _scope = require('./scope');

var _compiler = require('./compiler');

var _compiler2 = _interopRequireDefault(_compiler);

var _syntax = require('./syntax');

var _syntax2 = _interopRequireDefault(_syntax);

var _enforester = require('./enforester');

var _templateProcessor = require('./template-processor');

var _astDispatcher = require('./ast-dispatcher');

var _astDispatcher2 = _interopRequireDefault(_astDispatcher);

var _scopeReducer = require('./scope-reducer');

var _scopeReducer2 = _interopRequireDefault(_scopeReducer);

var _symbol = require('./symbol');

var _transforms = require('./transforms');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

class TermExpander extends _astDispatcher2.default {
  constructor(context) {
    super('expand', true);
    this.context = context;
  }

  expand(term) {
    return this.dispatch(term);
  }

  expandRawSyntax(term) {
    return term;
  }

  expandRawDelimiter(term) {
    return term;
  }

  expandTemplateExpression(term) {
    return new T.TemplateExpression({
      tag: term.tag == null ? null : this.expand(term.tag),
      elements: term.elements.toArray()
    });
  }

  expandBreakStatement(term) {
    return new T.BreakStatement({
      label: term.label ? term.label.val() : null
    });
  }

  expandDoWhileStatement(term) {
    return new T.DoWhileStatement({
      body: this.expand(term.body),
      test: this.expand(term.test)
    });
  }

  expandWithStatement(term) {
    return new T.WithStatement({
      body: this.expand(term.body),
      object: this.expand(term.object)
    });
  }

  expandDebuggerStatement(term) {
    return term;
  }

  expandContinueStatement(term) {
    return new T.ContinueStatement({
      label: term.label ? term.label.val() : null
    });
  }

  expandSwitchStatementWithDefault(term) {
    return new T.SwitchStatementWithDefault({
      discriminant: this.expand(term.discriminant),
      preDefaultCases: term.preDefaultCases.map(c => this.expand(c)).toArray(),
      defaultCase: this.expand(term.defaultCase),
      postDefaultCases: term.postDefaultCases.map(c => this.expand(c)).toArray()
    });
  }

  expandComputedMemberExpression(term) {
    return new T.ComputedMemberExpression({
      object: this.expand(term.object),
      expression: this.expand(term.expression)
    });
  }

  expandSwitchStatement(term) {
    return new T.SwitchStatement({
      discriminant: this.expand(term.discriminant),
      cases: term.cases.map(c => this.expand(c)).toArray()
    });
  }

  expandFormalParameters(term) {
    let rest = term.rest == null ? null : this.expand(term.rest);
    return new T.FormalParameters({
      items: term.items.map(i => this.expand(i)),
      rest
    });
  }

  expandArrowExpressionE(term) {
    return this.doFunctionExpansion(term, 'ArrowExpression');
  }

  expandArrowExpression(term) {
    return this.doFunctionExpansion(term, 'ArrowExpression');
  }

  expandSwitchDefault(term) {
    return new T.SwitchDefault({
      consequent: term.consequent.map(c => this.expand(c)).toArray()
    });
  }

  expandSwitchCase(term) {
    return new T.SwitchCase({
      test: this.expand(term.test),
      consequent: term.consequent.map(c => this.expand(c)).toArray()
    });
  }

  expandForInStatement(term) {
    return new T.ForInStatement({
      left: this.expand(term.left),
      right: this.expand(term.right),
      body: this.expand(term.body)
    });
  }

  expandTryCatchStatement(term) {
    return new T.TryCatchStatement({
      body: this.expand(term.body),
      catchClause: this.expand(term.catchClause)
    });
  }

  expandTryFinallyStatement(term) {
    let catchClause = term.catchClause == null ? null : this.expand(term.catchClause);
    return new T.TryFinallyStatement({
      body: this.expand(term.body),
      catchClause,
      finalizer: this.expand(term.finalizer)
    });
  }

  expandCatchClause(term) {
    return new T.CatchClause({
      binding: this.expand(term.binding),
      body: this.expand(term.body)
    });
  }

  expandThrowStatement(term) {
    return new T.ThrowStatement({
      expression: this.expand(term.expression)
    });
  }

  expandForOfStatement(term) {
    return new T.ForOfStatement({
      left: this.expand(term.left),
      right: this.expand(term.right),
      body: this.expand(term.body)
    });
  }

  expandBindingIdentifier(term) {
    return term;
  }

  expandBindingPropertyIdentifier(term) {
    return term;
  }
  expandBindingPropertyProperty(term) {
    return new T.BindingPropertyProperty({
      name: this.expand(term.name),
      binding: this.expand(term.binding)
    });
  }

  expandComputedPropertyName(term) {
    return new T.ComputedPropertyName({
      expression: this.expand(term.expression)
    });
  }

  expandObjectBinding(term) {
    return new T.ObjectBinding({
      properties: term.properties.map(t => this.expand(t)).toArray()
    });
  }

  expandArrayBinding(term) {
    let restElement = term.restElement == null ? null : this.expand(term.restElement);
    return new T.ArrayBinding({
      elements: term.elements.map(t => t == null ? null : this.expand(t)).toArray(),
      restElement
    });
  }

  expandBindingWithDefault(term) {
    return new T.BindingWithDefault({
      binding: this.expand(term.binding),
      init: this.expand(term.init)
    });
  }

  expandShorthandProperty(term) {
    // because hygiene, shorthand properties must turn into DataProperties
    return new T.DataProperty({
      name: new T.StaticPropertyName({
        value: term.name
      }),
      expression: new T.IdentifierExpression({
        name: term.name
      })
    });
  }

  expandForStatement(term) {
    let init = term.init == null ? null : this.expand(term.init);
    let test = term.test == null ? null : this.expand(term.test);
    let update = term.update == null ? null : this.expand(term.update);
    let body = this.expand(term.body);
    return new T.ForStatement({ init, test, update, body });
  }

  expandYieldExpression(term) {
    let expr = term.expression == null ? null : this.expand(term.expression);
    return new T.YieldExpression({
      expression: expr
    });
  }

  expandYieldGeneratorExpression(term) {
    let expr = term.expression == null ? null : this.expand(term.expression);
    return new T.YieldGeneratorExpression({
      expression: expr
    });
  }

  expandWhileStatement(term) {
    return new T.WhileStatement({
      test: this.expand(term.test),
      body: this.expand(term.body)
    });
  }

  expandIfStatement(term) {
    let consequent = term.consequent == null ? null : this.expand(term.consequent);
    let alternate = term.alternate == null ? null : this.expand(term.alternate);
    return new T.IfStatement({
      test: this.expand(term.test),
      consequent: consequent,
      alternate: alternate
    });
  }

  expandBlockStatement(term) {
    return new T.BlockStatement({
      block: this.expand(term.block)
    });
  }

  expandBlock(term) {
    let scope = (0, _scope.freshScope)('block');
    this.context.currentScope.push(scope);
    let compiler = new _compiler2.default(this.context.phase, this.context.env, this.context.store, this.context);

    let markedBody, bodyTerm;
    markedBody = term.statements.map(b => b.reduce(new _scopeReducer2.default([{ scope, phase: _syntax.ALL_PHASES, flip: false }], this.context.bindings)));
    bodyTerm = new T.Block({
      statements: compiler.compile(markedBody)
    });
    this.context.currentScope.pop();
    return bodyTerm;
  }

  expandVariableDeclarationStatement(term) {
    return new T.VariableDeclarationStatement({
      declaration: this.expand(term.declaration)
    });
  }
  expandReturnStatement(term) {
    if (term.expression == null) {
      return term;
    }
    return new T.ReturnStatement({
      expression: this.expand(term.expression)
    });
  }

  expandClassDeclaration(term) {
    return new T.ClassDeclaration({
      name: term.name == null ? null : this.expand(term.name),
      super: term.super == null ? null : this.expand(term.super),
      elements: term.elements.map(el => this.expand(el)).toArray()
    });
  }

  expandClassExpression(term) {
    return new T.ClassExpression({
      name: term.name == null ? null : this.expand(term.name),
      super: term.super == null ? null : this.expand(term.super),
      elements: term.elements.map(el => this.expand(el)).toArray()
    });
  }

  expandClassElement(term) {
    return new T.ClassElement({
      isStatic: term.isStatic,
      method: this.expand(term.method)
    });
  }

  expandThisExpression(term) {
    return term;
  }

  expandSyntaxTemplate(term) {
    let r = (0, _templateProcessor.processTemplate)(term.template.slice(1, term.template.size - 1));
    let ident = this.context.getTemplateIdentifier();
    this.context.templateMap.set(ident, r.template);
    let name = _syntax2.default.fromIdentifier('syntaxTemplate', term.template.first().value);
    let callee = new T.IdentifierExpression({
      name: name
    });

    let expandedInterps = r.interp.map(i => {
      let enf = new _enforester.Enforester(i, (0, _immutable.List)(), this.context);
      return this.expand(enf.enforest('expression'));
    });

    let args = _immutable.List.of(new T.LiteralNumericExpression({ value: ident })).concat(expandedInterps);

    return new T.CallExpression({
      callee, arguments: args
    });
  }

  expandStaticMemberExpression(term) {
    return new T.StaticMemberExpression({
      object: this.expand(term.object),
      property: term.property
    });
  }

  expandArrayExpression(term) {
    return new T.ArrayExpression({
      elements: term.elements.map(t => t == null ? t : this.expand(t))
    });
  }

  expandImport(term) {
    return term;
  }

  expandImportNamespace(term) {
    return term;
  }

  expandExport(term) {
    return new T.Export({
      declaration: this.expand(term.declaration)
    });
  }

  expandExportDefault(term) {
    return new T.ExportDefault({
      body: this.expand(term.body)
    });
  }

  expandExportFrom(term) {
    return term;
  }

  expandExportAllFrom(term) {
    return term;
  }

  expandExportSpecifier(term) {
    return term;
  }

  expandStaticPropertyName(term) {
    return term;
  }

  expandDataProperty(term) {
    return new T.DataProperty({
      name: this.expand(term.name),
      expression: this.expand(term.expression)
    });
  }

  expandObjectExpression(term) {
    return new T.ObjectExpression({
      properties: term.properties.map(t => this.expand(t))
    });
  }

  expandVariableDeclarator(term) {
    let init = term.init == null ? null : this.expand(term.init);
    return new T.VariableDeclarator({
      binding: this.expand(term.binding),
      init: init
    });
  }

  expandVariableDeclaration(term) {
    if (term.kind === 'syntax' || term.kind === 'syntaxrec') {
      return term;
    }
    return new T.VariableDeclaration({
      kind: term.kind,
      declarators: term.declarators.map(d => this.expand(d))
    });
  }

  expandParenthesizedExpression(term) {
    if (term.inner.size === 0) {
      throw new Error('unexpected end of input');
    }
    let enf = new _enforester.Enforester(term.inner, (0, _immutable.List)(), this.context);
    let lookahead = enf.peek();
    let t = enf.enforestExpression();
    if (t == null || enf.rest.size > 0) {
      throw enf.createError(lookahead, 'unexpected syntax');
    }
    return this.expand(t);
  }

  expandUnaryExpression(term) {
    return new T.UnaryExpression({
      operator: term.operator,
      operand: this.expand(term.operand)
    });
  }

  expandUpdateExpression(term) {
    return new T.UpdateExpression({
      isPrefix: term.isPrefix,
      operator: term.operator,
      operand: this.expand(term.operand)
    });
  }

  expandBinaryExpression(term) {
    let left = this.expand(term.left);
    let right = this.expand(term.right);
    return new T.BinaryExpression({
      left: left,
      operator: term.operator,
      right: right
    });
  }

  expandConditionalExpression(term) {
    return new T.ConditionalExpression({
      test: this.expand(term.test),
      consequent: this.expand(term.consequent),
      alternate: this.expand(term.alternate)
    });
  }

  expandNewTargetExpression(term) {
    return term;
  }

  expandNewExpression(term) {
    let callee = this.expand(term.callee);
    let enf = new _enforester.Enforester(term.arguments, (0, _immutable.List)(), this.context);
    let args = enf.enforestArgumentList().map(arg => this.expand(arg));
    return new T.NewExpression({
      callee,
      arguments: args.toArray()
    });
  }

  expandSuper(term) {
    return term;
  }

  expandCallExpressionE(term) {
    let callee = this.expand(term.callee);
    let enf = new _enforester.Enforester(term.arguments, (0, _immutable.List)(), this.context);
    let args = enf.enforestArgumentList().map(arg => this.expand(arg));
    return new T.CallExpression({
      callee: callee,
      arguments: args
    });
  }

  expandSpreadElement(term) {
    return new T.SpreadElement({
      expression: this.expand(term.expression)
    });
  }

  expandExpressionStatement(term) {
    let child = this.expand(term.expression);
    return new T.ExpressionStatement({
      expression: child
    });
  }

  expandLabeledStatement(term) {
    return new T.LabeledStatement({
      label: term.label.val(),
      body: this.expand(term.body)
    });
  }

  doFunctionExpansion(term, type) {
    let scope = (0, _scope.freshScope)('fun');
    let params;
    let self = this;
    if (type !== 'Getter' && type !== 'Setter') {
      // TODO: need to register the parameter bindings again
      params = term.params.reduce(new class extends T.default.CloneReducer {
        reduceBindingIdentifier(term) {
          let name = term.name.addScope(scope, self.context.bindings, _syntax.ALL_PHASES);
          let newBinding = (0, _symbol.gensym)(name.val());

          self.context.env.set(newBinding.toString(), new _transforms.VarBindingTransform(name));
          self.context.bindings.add(name, {
            binding: newBinding,
            phase: self.context.phase,
            skipDup: true
          });
          return new T.BindingIdentifier({ name });
        }
      }());
      params = this.expand(params);
    }
    this.context.currentScope.push(scope);
    let compiler = new _compiler2.default(this.context.phase, this.context.env, this.context.store, this.context);

    let bodyTerm;
    let scopeReducer = new _scopeReducer2.default([{ scope, phase: _syntax.ALL_PHASES, flip: false }], this.context.bindings);
    if (term.body instanceof T.default) {
      // Arrow functions have a single term as their body
      bodyTerm = this.expand(term.body.reduce(scopeReducer));
    } else {
      let compiledBody = compiler.compile(term.body.map(b => b.reduce(scopeReducer)));
      const directives = compiledBody.takeWhile(s => (0, _terms.isExpressionStatement)(s) && (0, _terms.isLiteralStringExpression)(s.expression)).map(s => new T.Directive({ rawValue: s.expression.value }));
      bodyTerm = new T.FunctionBody({
        directives: directives,
        statements: compiledBody.slice(directives.size)
      });
    }
    this.context.currentScope.pop();

    switch (type) {
      case 'Getter':
        return new T.Getter({
          name: this.expand(term.name),
          body: bodyTerm
        });
      case 'Setter':
        return new T.Setter({
          name: this.expand(term.name),
          param: term.param,
          body: bodyTerm
        });
      case 'Method':
        return new T.Method({
          name: term.name,
          isGenerator: term.isGenerator,
          params: params,
          body: bodyTerm
        });
      case 'ArrowExpression':
        return new T.ArrowExpression({
          params: params,
          body: bodyTerm
        });
      case 'FunctionExpression':
        return new T.FunctionExpression({
          name: term.name,
          isGenerator: term.isGenerator,
          params: params,
          body: bodyTerm
        });
      case 'FunctionDeclaration':
        return new T.FunctionDeclaration({
          name: term.name,
          isGenerator: term.isGenerator,
          params: params,
          body: bodyTerm
        });
      default:
        throw new Error(`Unknown function type: ${ type }`);
    }
  }

  expandMethod(term) {
    return this.doFunctionExpansion(term, 'Method');
  }

  expandSetter(term) {
    return this.doFunctionExpansion(term, 'Setter');
  }

  expandGetter(term) {
    return this.doFunctionExpansion(term, 'Getter');
  }

  expandFunctionDeclarationE(term) {
    return this.doFunctionExpansion(term, 'FunctionDeclaration');
  }

  expandFunctionExpressionE(term) {
    return this.doFunctionExpansion(term, 'FunctionExpression');
  }

  expandCompoundAssignmentExpression(term) {
    return new T.CompoundAssignmentExpression({
      binding: this.expand(term.binding),
      operator: term.operator,
      expression: this.expand(term.expression)
    });
  }

  expandAssignmentExpression(term) {
    return new T.AssignmentExpression({
      binding: this.expand(term.binding),
      expression: this.expand(term.expression)
    });
  }

  expandEmptyStatement(term) {
    return term;
  }

  expandLiteralBooleanExpression(term) {
    return term;
  }

  expandLiteralNumericExpression(term) {
    return term;
  }
  expandLiteralInfinityExpression(term) {
    return term;
  }

  expandIdentifierExpression(term) {
    let trans = this.context.env.get(term.name.resolve(this.context.phase));
    if (trans) {
      return new T.IdentifierExpression({
        name: trans.id
      });
    }
    return term;
  }

  expandLiteralNullExpression(term) {
    return term;
  }

  expandLiteralStringExpression(term) {
    return term;
  }

  expandLiteralRegExpExpression(term) {
    return term;
  }
}
exports.default = TermExpander;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy90ZXJtLWV4cGFuZGVyLmpzIl0sIm5hbWVzIjpbIlQiLCJUZXJtRXhwYW5kZXIiLCJjb25zdHJ1Y3RvciIsImNvbnRleHQiLCJleHBhbmQiLCJ0ZXJtIiwiZGlzcGF0Y2giLCJleHBhbmRSYXdTeW50YXgiLCJleHBhbmRSYXdEZWxpbWl0ZXIiLCJleHBhbmRUZW1wbGF0ZUV4cHJlc3Npb24iLCJUZW1wbGF0ZUV4cHJlc3Npb24iLCJ0YWciLCJlbGVtZW50cyIsInRvQXJyYXkiLCJleHBhbmRCcmVha1N0YXRlbWVudCIsIkJyZWFrU3RhdGVtZW50IiwibGFiZWwiLCJ2YWwiLCJleHBhbmREb1doaWxlU3RhdGVtZW50IiwiRG9XaGlsZVN0YXRlbWVudCIsImJvZHkiLCJ0ZXN0IiwiZXhwYW5kV2l0aFN0YXRlbWVudCIsIldpdGhTdGF0ZW1lbnQiLCJvYmplY3QiLCJleHBhbmREZWJ1Z2dlclN0YXRlbWVudCIsImV4cGFuZENvbnRpbnVlU3RhdGVtZW50IiwiQ29udGludWVTdGF0ZW1lbnQiLCJleHBhbmRTd2l0Y2hTdGF0ZW1lbnRXaXRoRGVmYXVsdCIsIlN3aXRjaFN0YXRlbWVudFdpdGhEZWZhdWx0IiwiZGlzY3JpbWluYW50IiwicHJlRGVmYXVsdENhc2VzIiwibWFwIiwiYyIsImRlZmF1bHRDYXNlIiwicG9zdERlZmF1bHRDYXNlcyIsImV4cGFuZENvbXB1dGVkTWVtYmVyRXhwcmVzc2lvbiIsIkNvbXB1dGVkTWVtYmVyRXhwcmVzc2lvbiIsImV4cHJlc3Npb24iLCJleHBhbmRTd2l0Y2hTdGF0ZW1lbnQiLCJTd2l0Y2hTdGF0ZW1lbnQiLCJjYXNlcyIsImV4cGFuZEZvcm1hbFBhcmFtZXRlcnMiLCJyZXN0IiwiRm9ybWFsUGFyYW1ldGVycyIsIml0ZW1zIiwiaSIsImV4cGFuZEFycm93RXhwcmVzc2lvbkUiLCJkb0Z1bmN0aW9uRXhwYW5zaW9uIiwiZXhwYW5kQXJyb3dFeHByZXNzaW9uIiwiZXhwYW5kU3dpdGNoRGVmYXVsdCIsIlN3aXRjaERlZmF1bHQiLCJjb25zZXF1ZW50IiwiZXhwYW5kU3dpdGNoQ2FzZSIsIlN3aXRjaENhc2UiLCJleHBhbmRGb3JJblN0YXRlbWVudCIsIkZvckluU3RhdGVtZW50IiwibGVmdCIsInJpZ2h0IiwiZXhwYW5kVHJ5Q2F0Y2hTdGF0ZW1lbnQiLCJUcnlDYXRjaFN0YXRlbWVudCIsImNhdGNoQ2xhdXNlIiwiZXhwYW5kVHJ5RmluYWxseVN0YXRlbWVudCIsIlRyeUZpbmFsbHlTdGF0ZW1lbnQiLCJmaW5hbGl6ZXIiLCJleHBhbmRDYXRjaENsYXVzZSIsIkNhdGNoQ2xhdXNlIiwiYmluZGluZyIsImV4cGFuZFRocm93U3RhdGVtZW50IiwiVGhyb3dTdGF0ZW1lbnQiLCJleHBhbmRGb3JPZlN0YXRlbWVudCIsIkZvck9mU3RhdGVtZW50IiwiZXhwYW5kQmluZGluZ0lkZW50aWZpZXIiLCJleHBhbmRCaW5kaW5nUHJvcGVydHlJZGVudGlmaWVyIiwiZXhwYW5kQmluZGluZ1Byb3BlcnR5UHJvcGVydHkiLCJCaW5kaW5nUHJvcGVydHlQcm9wZXJ0eSIsIm5hbWUiLCJleHBhbmRDb21wdXRlZFByb3BlcnR5TmFtZSIsIkNvbXB1dGVkUHJvcGVydHlOYW1lIiwiZXhwYW5kT2JqZWN0QmluZGluZyIsIk9iamVjdEJpbmRpbmciLCJwcm9wZXJ0aWVzIiwidCIsImV4cGFuZEFycmF5QmluZGluZyIsInJlc3RFbGVtZW50IiwiQXJyYXlCaW5kaW5nIiwiZXhwYW5kQmluZGluZ1dpdGhEZWZhdWx0IiwiQmluZGluZ1dpdGhEZWZhdWx0IiwiaW5pdCIsImV4cGFuZFNob3J0aGFuZFByb3BlcnR5IiwiRGF0YVByb3BlcnR5IiwiU3RhdGljUHJvcGVydHlOYW1lIiwidmFsdWUiLCJJZGVudGlmaWVyRXhwcmVzc2lvbiIsImV4cGFuZEZvclN0YXRlbWVudCIsInVwZGF0ZSIsIkZvclN0YXRlbWVudCIsImV4cGFuZFlpZWxkRXhwcmVzc2lvbiIsImV4cHIiLCJZaWVsZEV4cHJlc3Npb24iLCJleHBhbmRZaWVsZEdlbmVyYXRvckV4cHJlc3Npb24iLCJZaWVsZEdlbmVyYXRvckV4cHJlc3Npb24iLCJleHBhbmRXaGlsZVN0YXRlbWVudCIsIldoaWxlU3RhdGVtZW50IiwiZXhwYW5kSWZTdGF0ZW1lbnQiLCJhbHRlcm5hdGUiLCJJZlN0YXRlbWVudCIsImV4cGFuZEJsb2NrU3RhdGVtZW50IiwiQmxvY2tTdGF0ZW1lbnQiLCJibG9jayIsImV4cGFuZEJsb2NrIiwic2NvcGUiLCJjdXJyZW50U2NvcGUiLCJwdXNoIiwiY29tcGlsZXIiLCJwaGFzZSIsImVudiIsInN0b3JlIiwibWFya2VkQm9keSIsImJvZHlUZXJtIiwic3RhdGVtZW50cyIsImIiLCJyZWR1Y2UiLCJmbGlwIiwiYmluZGluZ3MiLCJCbG9jayIsImNvbXBpbGUiLCJwb3AiLCJleHBhbmRWYXJpYWJsZURlY2xhcmF0aW9uU3RhdGVtZW50IiwiVmFyaWFibGVEZWNsYXJhdGlvblN0YXRlbWVudCIsImRlY2xhcmF0aW9uIiwiZXhwYW5kUmV0dXJuU3RhdGVtZW50IiwiUmV0dXJuU3RhdGVtZW50IiwiZXhwYW5kQ2xhc3NEZWNsYXJhdGlvbiIsIkNsYXNzRGVjbGFyYXRpb24iLCJzdXBlciIsImVsIiwiZXhwYW5kQ2xhc3NFeHByZXNzaW9uIiwiQ2xhc3NFeHByZXNzaW9uIiwiZXhwYW5kQ2xhc3NFbGVtZW50IiwiQ2xhc3NFbGVtZW50IiwiaXNTdGF0aWMiLCJtZXRob2QiLCJleHBhbmRUaGlzRXhwcmVzc2lvbiIsImV4cGFuZFN5bnRheFRlbXBsYXRlIiwiciIsInRlbXBsYXRlIiwic2xpY2UiLCJzaXplIiwiaWRlbnQiLCJnZXRUZW1wbGF0ZUlkZW50aWZpZXIiLCJ0ZW1wbGF0ZU1hcCIsInNldCIsImZyb21JZGVudGlmaWVyIiwiZmlyc3QiLCJjYWxsZWUiLCJleHBhbmRlZEludGVycHMiLCJpbnRlcnAiLCJlbmYiLCJlbmZvcmVzdCIsImFyZ3MiLCJvZiIsIkxpdGVyYWxOdW1lcmljRXhwcmVzc2lvbiIsImNvbmNhdCIsIkNhbGxFeHByZXNzaW9uIiwiYXJndW1lbnRzIiwiZXhwYW5kU3RhdGljTWVtYmVyRXhwcmVzc2lvbiIsIlN0YXRpY01lbWJlckV4cHJlc3Npb24iLCJwcm9wZXJ0eSIsImV4cGFuZEFycmF5RXhwcmVzc2lvbiIsIkFycmF5RXhwcmVzc2lvbiIsImV4cGFuZEltcG9ydCIsImV4cGFuZEltcG9ydE5hbWVzcGFjZSIsImV4cGFuZEV4cG9ydCIsIkV4cG9ydCIsImV4cGFuZEV4cG9ydERlZmF1bHQiLCJFeHBvcnREZWZhdWx0IiwiZXhwYW5kRXhwb3J0RnJvbSIsImV4cGFuZEV4cG9ydEFsbEZyb20iLCJleHBhbmRFeHBvcnRTcGVjaWZpZXIiLCJleHBhbmRTdGF0aWNQcm9wZXJ0eU5hbWUiLCJleHBhbmREYXRhUHJvcGVydHkiLCJleHBhbmRPYmplY3RFeHByZXNzaW9uIiwiT2JqZWN0RXhwcmVzc2lvbiIsImV4cGFuZFZhcmlhYmxlRGVjbGFyYXRvciIsIlZhcmlhYmxlRGVjbGFyYXRvciIsImV4cGFuZFZhcmlhYmxlRGVjbGFyYXRpb24iLCJraW5kIiwiVmFyaWFibGVEZWNsYXJhdGlvbiIsImRlY2xhcmF0b3JzIiwiZCIsImV4cGFuZFBhcmVudGhlc2l6ZWRFeHByZXNzaW9uIiwiaW5uZXIiLCJFcnJvciIsImxvb2thaGVhZCIsInBlZWsiLCJlbmZvcmVzdEV4cHJlc3Npb24iLCJjcmVhdGVFcnJvciIsImV4cGFuZFVuYXJ5RXhwcmVzc2lvbiIsIlVuYXJ5RXhwcmVzc2lvbiIsIm9wZXJhdG9yIiwib3BlcmFuZCIsImV4cGFuZFVwZGF0ZUV4cHJlc3Npb24iLCJVcGRhdGVFeHByZXNzaW9uIiwiaXNQcmVmaXgiLCJleHBhbmRCaW5hcnlFeHByZXNzaW9uIiwiQmluYXJ5RXhwcmVzc2lvbiIsImV4cGFuZENvbmRpdGlvbmFsRXhwcmVzc2lvbiIsIkNvbmRpdGlvbmFsRXhwcmVzc2lvbiIsImV4cGFuZE5ld1RhcmdldEV4cHJlc3Npb24iLCJleHBhbmROZXdFeHByZXNzaW9uIiwiZW5mb3Jlc3RBcmd1bWVudExpc3QiLCJhcmciLCJOZXdFeHByZXNzaW9uIiwiZXhwYW5kU3VwZXIiLCJleHBhbmRDYWxsRXhwcmVzc2lvbkUiLCJleHBhbmRTcHJlYWRFbGVtZW50IiwiU3ByZWFkRWxlbWVudCIsImV4cGFuZEV4cHJlc3Npb25TdGF0ZW1lbnQiLCJjaGlsZCIsIkV4cHJlc3Npb25TdGF0ZW1lbnQiLCJleHBhbmRMYWJlbGVkU3RhdGVtZW50IiwiTGFiZWxlZFN0YXRlbWVudCIsInR5cGUiLCJwYXJhbXMiLCJzZWxmIiwiQ2xvbmVSZWR1Y2VyIiwicmVkdWNlQmluZGluZ0lkZW50aWZpZXIiLCJhZGRTY29wZSIsIm5ld0JpbmRpbmciLCJ0b1N0cmluZyIsImFkZCIsInNraXBEdXAiLCJCaW5kaW5nSWRlbnRpZmllciIsInNjb3BlUmVkdWNlciIsImNvbXBpbGVkQm9keSIsImRpcmVjdGl2ZXMiLCJ0YWtlV2hpbGUiLCJzIiwiRGlyZWN0aXZlIiwicmF3VmFsdWUiLCJGdW5jdGlvbkJvZHkiLCJHZXR0ZXIiLCJTZXR0ZXIiLCJwYXJhbSIsIk1ldGhvZCIsImlzR2VuZXJhdG9yIiwiQXJyb3dFeHByZXNzaW9uIiwiRnVuY3Rpb25FeHByZXNzaW9uIiwiRnVuY3Rpb25EZWNsYXJhdGlvbiIsImV4cGFuZE1ldGhvZCIsImV4cGFuZFNldHRlciIsImV4cGFuZEdldHRlciIsImV4cGFuZEZ1bmN0aW9uRGVjbGFyYXRpb25FIiwiZXhwYW5kRnVuY3Rpb25FeHByZXNzaW9uRSIsImV4cGFuZENvbXBvdW5kQXNzaWdubWVudEV4cHJlc3Npb24iLCJDb21wb3VuZEFzc2lnbm1lbnRFeHByZXNzaW9uIiwiZXhwYW5kQXNzaWdubWVudEV4cHJlc3Npb24iLCJBc3NpZ25tZW50RXhwcmVzc2lvbiIsImV4cGFuZEVtcHR5U3RhdGVtZW50IiwiZXhwYW5kTGl0ZXJhbEJvb2xlYW5FeHByZXNzaW9uIiwiZXhwYW5kTGl0ZXJhbE51bWVyaWNFeHByZXNzaW9uIiwiZXhwYW5kTGl0ZXJhbEluZmluaXR5RXhwcmVzc2lvbiIsImV4cGFuZElkZW50aWZpZXJFeHByZXNzaW9uIiwidHJhbnMiLCJnZXQiLCJyZXNvbHZlIiwiaWQiLCJleHBhbmRMaXRlcmFsTnVsbEV4cHJlc3Npb24iLCJleHBhbmRMaXRlcmFsU3RyaW5nRXhwcmVzc2lvbiIsImV4cGFuZExpdGVyYWxSZWdFeHBFeHByZXNzaW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7SUFBa0JBLEM7O0FBQ2xCOztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7OztBQUdlLE1BQU1DLFlBQU4saUNBQXlDO0FBQ3REQyxjQUFZQyxPQUFaLEVBQXFCO0FBQ25CLFVBQU0sUUFBTixFQUFnQixJQUFoQjtBQUNBLFNBQUtBLE9BQUwsR0FBZUEsT0FBZjtBQUNEOztBQUVEQyxTQUFPQyxJQUFQLEVBQWE7QUFDWCxXQUFPLEtBQUtDLFFBQUwsQ0FBY0QsSUFBZCxDQUFQO0FBQ0Q7O0FBRURFLGtCQUFnQkYsSUFBaEIsRUFBc0I7QUFDcEIsV0FBT0EsSUFBUDtBQUNEOztBQUVERyxxQkFBbUJILElBQW5CLEVBQXlCO0FBQ3ZCLFdBQU9BLElBQVA7QUFDRDs7QUFFREksMkJBQXlCSixJQUF6QixFQUErQjtBQUM3QixXQUFPLElBQUlMLEVBQUVVLGtCQUFOLENBQXlCO0FBQzlCQyxXQUFLTixLQUFLTSxHQUFMLElBQVksSUFBWixHQUFtQixJQUFuQixHQUEwQixLQUFLUCxNQUFMLENBQVlDLEtBQUtNLEdBQWpCLENBREQ7QUFFOUJDLGdCQUFVUCxLQUFLTyxRQUFMLENBQWNDLE9BQWQ7QUFGb0IsS0FBekIsQ0FBUDtBQUlEOztBQUVEQyx1QkFBcUJULElBQXJCLEVBQTJCO0FBQ3pCLFdBQU8sSUFBSUwsRUFBRWUsY0FBTixDQUFxQjtBQUMxQkMsYUFBT1gsS0FBS1csS0FBTCxHQUFhWCxLQUFLVyxLQUFMLENBQVdDLEdBQVgsRUFBYixHQUFnQztBQURiLEtBQXJCLENBQVA7QUFHRDs7QUFFREMseUJBQXVCYixJQUF2QixFQUE2QjtBQUMzQixXQUFP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QUtyUSxPQUFMLENBQWFpSCxHQUFiLENBQWlCcUosR0FBakIsQ0FBcUJwUSxLQUFLdUUsSUFBTCxDQUFVOEwsT0FBVixDQUFrQixLQUFLdlEsT0FBTCxDQUFhZ0gsS0FBL0IsQ0FBckIsQ0FBWjtBQUNBLFFBQUlxSixLQUFKLEVBQVc7QUFDVCxhQUFPLElBQUl4USxFQUFFNkYsb0JBQU4sQ0FBMkI7QUFDaENqQixjQUFNNEwsTUFBTUc7QUFEb0IsT0FBM0IsQ0FBUDtBQUdEO0FBQ0QsV0FBT3RRLElBQVA7QUFDRDs7QUFFRHVRLDhCQUE0QnZRLElBQTVCLEVBQWtDO0FBQ2hDLFdBQU9BLElBQVA7QUFDRDs7QUFFRHdRLGdDQUE4QnhRLElBQTlCLEVBQW9DO0FBQ2xDLFdBQU9BLElBQVA7QUFDRDs7QUFFRHlRLGdDQUE4QnpRLElBQTlCLEVBQW9DO0FBQ2xDLFdBQU9BLElBQVA7QUFDRDtBQS9vQnFEO2tCQUFuQ0osWSIsImZpbGUiOiJ0ZXJtLWV4cGFuZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTGlzdCB9IGZyb20gJ2ltbXV0YWJsZSc7XG5pbXBvcnQgeyBpc0V4cHJlc3Npb25TdGF0ZW1lbnQsIGlzTGl0ZXJhbFN0cmluZ0V4cHJlc3Npb24gfSBmcm9tICcuL3Rlcm1zJztcbmltcG9ydCBUZXJtLCAqIGFzIFQgZnJvbSAnc3dlZXQtc3BlYyc7XG5pbXBvcnQgeyBmcmVzaFNjb3BlIH0gZnJvbSAnLi9zY29wZSc7XG5pbXBvcnQgQ29tcGlsZXIgZnJvbSAnLi9jb21waWxlcic7XG5pbXBvcnQgeyBBTExfUEhBU0VTIH0gZnJvbSAnLi9zeW50YXgnO1xuaW1wb3J0IHsgRW5mb3Jlc3RlciB9IGZyb20gJy4vZW5mb3Jlc3Rlcic7XG5pbXBvcnQgeyBwcm9jZXNzVGVtcGxhdGUgfSBmcm9tICcuL3RlbXBsYXRlLXByb2Nlc3Nvcic7XG5pbXBvcnQgQVNURGlzcGF0Y2hlciBmcm9tICcuL2FzdC1kaXNwYXRjaGVyJztcbmltcG9ydCBTY29wZVJlZHVjZXIgZnJvbSAnLi9zY29wZS1yZWR1Y2VyJztcbmltcG9ydCB7IGdlbnN5bSB9IGZyb20gJy4vc3ltYm9sJztcbmltcG9ydCB7IFZhckJpbmRpbmdUcmFuc2Zvcm0gfSBmcm9tICcuL3RyYW5zZm9ybXMnO1xuaW1wb3J0IFN5bnRheCBmcm9tICcuL3N5bnRheCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlcm1FeHBhbmRlciBleHRlbmRzIEFTVERpc3BhdGNoZXIge1xuICBjb25zdHJ1Y3Rvcihjb250ZXh0KSB7XG4gICAgc3VwZXIoJ2V4cGFuZCcsIHRydWUpO1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIH1cblxuICBleHBhbmQodGVybSkge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKHRlcm0pO1xuICB9XG5cbiAgZXhwYW5kUmF3U3ludGF4KHRlcm0pIHtcbiAgICByZXR1cm4gdGVybTtcbiAgfVxuXG4gIGV4cGFuZFJhd0RlbGltaXRlcih0ZXJtKSB7XG4gICAgcmV0dXJuIHRlcm07XG4gIH1cblxuICBleHBhbmRUZW1wbGF0ZUV4cHJlc3Npb24odGVybSkge1xuICAgIHJldHVybiBuZXcgVC5UZW1wbGF0ZUV4cHJlc3Npb24oe1xuICAgICAgdGFnOiB0ZXJtLnRhZyA9PSBudWxsID8gbnVsbCA6IHRoaXMuZXhwYW5kKHRlcm0udGFnKSxcbiAgICAgIGVsZW1lbnRzOiB0ZXJtLmVsZW1lbnRzLnRvQXJyYXkoKVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kQnJlYWtTdGF0ZW1lbnQodGVybSkge1xuICAgIHJldHVybiBuZXcgVC5CcmVha1N0YXRlbWVudCh7XG4gICAgICBsYWJlbDogdGVybS5sYWJlbCA/IHRlcm0ubGFiZWwudmFsKCkgOiBudWxsXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmREb1doaWxlU3RhdGVtZW50KHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuRG9XaGlsZVN0YXRlbWVudCh7XG4gICAgICBib2R5OiB0aGlzLmV4cGFuZCh0ZXJtLmJvZHkpLFxuICAgICAgdGVzdDogdGhpcy5leHBhbmQodGVybS50ZXN0KVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kV2l0aFN0YXRlbWVudCh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULldpdGhTdGF0ZW1lbnQoe1xuICAgICAgYm9keTogdGhpcy5leHBhbmQodGVybS5ib2R5KSxcbiAgICAgIG9iamVjdDogdGhpcy5leHBhbmQodGVybS5vYmplY3QpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmREZWJ1Z2dlclN0YXRlbWVudCh0ZXJtKSB7IHJldHVybiB0ZXJtO31cblxuICBleHBhbmRDb250aW51ZVN0YXRlbWVudCh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULkNvbnRpbnVlU3RhdGVtZW50KHtcbiAgICAgIGxhYmVsOiB0ZXJtLmxhYmVsID8gdGVybS5sYWJlbC52YWwoKSA6IG51bGxcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZFN3aXRjaFN0YXRlbWVudFdpdGhEZWZhdWx0KHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuU3dpdGNoU3RhdGVtZW50V2l0aERlZmF1bHQoe1xuICAgICAgZGlzY3JpbWluYW50OiB0aGlzLmV4cGFuZCh0ZXJtLmRpc2NyaW1pbmFudCksXG4gICAgICBwcmVEZWZhdWx0Q2FzZXM6IHRlcm0ucHJlRGVmYXVsdENhc2VzLm1hcChjID0+IHRoaXMuZXhwYW5kKGMpKS50b0FycmF5KCksXG4gICAgICBkZWZhdWx0Q2FzZTogdGhpcy5leHBhbmQodGVybS5kZWZhdWx0Q2FzZSksXG4gICAgICBwb3N0RGVmYXVsdENhc2VzOiB0ZXJtLnBvc3REZWZhdWx0Q2FzZXMubWFwKGMgPT4gdGhpcy5leHBhbmQoYykpLnRvQXJyYXkoKVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kQ29tcHV0ZWRNZW1iZXJFeHByZXNzaW9uKHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuQ29tcHV0ZWRNZW1iZXJFeHByZXNzaW9uKHtcbiAgICAgIG9iamVjdDogdGhpcy5leHBhbmQodGVybS5vYmplY3QpLFxuICAgICAgZXhwcmVzc2lvbjogdGhpcy5leHBhbmQodGVybS5leHByZXNzaW9uKVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kU3dpdGNoU3RhdGVtZW50KHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuU3dpdGNoU3RhdGVtZW50KHtcbiAgICAgIGRpc2NyaW1pbmFudDogdGhpcy5leHBhbmQodGVybS5kaXNjcmltaW5hbnQpLFxuICAgICAgY2FzZXM6IHRlcm0uY2FzZXMubWFwKGMgPT4gdGhpcy5leHBhbmQoYykpLnRvQXJyYXkoKVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kRm9ybWFsUGFyYW1ldGVycyh0ZXJtKSB7XG4gICAgbGV0IHJlc3QgPSB0ZXJtLnJlc3QgPT0gbnVsbCA/IG51bGwgOiB0aGlzLmV4cGFuZCh0ZXJtLnJlc3QpO1xuICAgIHJldHVybiBuZXcgVC5Gb3JtYWxQYXJhbWV0ZXJzKHtcbiAgICAgIGl0ZW1zOiB0ZXJtLml0ZW1zLm1hcChpID0+IHRoaXMuZXhwYW5kKGkpKSxcbiAgICAgIHJlc3RcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZEFycm93RXhwcmVzc2lvbkUodGVybSkge1xuICAgIHJldHVybiB0aGlzLmRvRnVuY3Rpb25FeHBhbnNpb24odGVybSwgJ0Fycm93RXhwcmVzc2lvbicpO1xuICB9XG5cbiAgZXhwYW5kQXJyb3dFeHByZXNzaW9uKHRlcm0pIHtcbiAgICByZXR1cm4gdGhpcy5kb0Z1bmN0aW9uRXhwYW5zaW9uKHRlcm0sICdBcnJvd0V4cHJlc3Npb24nKTtcbiAgfVxuXG4gIGV4cGFuZFN3aXRjaERlZmF1bHQodGVybSkge1xuICAgIHJldHVybiBuZXcgVC5Td2l0Y2hEZWZhdWx0KHtcbiAgICAgIGNvbnNlcXVlbnQ6IHRlcm0uY29uc2VxdWVudC5tYXAoYyA9PiB0aGlzLmV4cGFuZChjKSkudG9BcnJheSgpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRTd2l0Y2hDYXNlKHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuU3dpdGNoQ2FzZSh7XG4gICAgICB0ZXN0OiB0aGlzLmV4cGFuZCh0ZXJtLnRlc3QpLFxuICAgICAgY29uc2VxdWVudDogdGVybS5jb25zZXF1ZW50Lm1hcChjID0+IHRoaXMuZXhwYW5kKGMpKS50b0FycmF5KClcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZEZvckluU3RhdGVtZW50KHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuRm9ySW5TdGF0ZW1lbnQoe1xuICAgICAgbGVmdDogdGhpcy5leHBhbmQodGVybS5sZWZ0KSxcbiAgICAgIHJpZ2h0OiB0aGlzLmV4cGFuZCh0ZXJtLnJpZ2h0KSxcbiAgICAgIGJvZHk6IHRoaXMuZXhwYW5kKHRlcm0uYm9keSlcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZFRyeUNhdGNoU3RhdGVtZW50KHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuVHJ5Q2F0Y2hTdGF0ZW1lbnQoe1xuICAgICAgYm9keTogdGhpcy5leHBhbmQodGVybS5ib2R5KSxcbiAgICAgIGNhdGNoQ2xhdXNlOiB0aGlzLmV4cGFuZCh0ZXJtLmNhdGNoQ2xhdXNlKVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kVHJ5RmluYWxseVN0YXRlbWVudCh0ZXJtKSB7XG4gICAgbGV0IGNhdGNoQ2xhdXNlID0gdGVybS5jYXRjaENsYXVzZSA9PSBudWxsID8gbnVsbCA6IHRoaXMuZXhwYW5kKHRlcm0uY2F0Y2hDbGF1c2UpO1xuICAgIHJldHVybiBuZXcgVC5UcnlGaW5hbGx5U3RhdGVtZW50KHtcbiAgICAgIGJvZHk6IHRoaXMuZXhwYW5kKHRlcm0uYm9keSksXG4gICAgICBjYXRjaENsYXVzZSxcbiAgICAgIGZpbmFsaXplcjogdGhpcy5leHBhbmQodGVybS5maW5hbGl6ZXIpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRDYXRjaENsYXVzZSh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULkNhdGNoQ2xhdXNlKHtcbiAgICAgIGJpbmRpbmc6IHRoaXMuZXhwYW5kKHRlcm0uYmluZGluZyksXG4gICAgICBib2R5OiB0aGlzLmV4cGFuZCh0ZXJtLmJvZHkpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRUaHJvd1N0YXRlbWVudCh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULlRocm93U3RhdGVtZW50KHtcbiAgICAgIGV4cHJlc3Npb246IHRoaXMuZXhwYW5kKHRlcm0uZXhwcmVzc2lvbilcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZEZvck9mU3RhdGVtZW50KHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuRm9yT2ZTdGF0ZW1lbnQoe1xuICAgICAgbGVmdDogdGhpcy5leHBhbmQodGVybS5sZWZ0KSxcbiAgICAgIHJpZ2h0OiB0aGlzLmV4cGFuZCh0ZXJtLnJpZ2h0KSxcbiAgICAgIGJvZHk6IHRoaXMuZXhwYW5kKHRlcm0uYm9keSlcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZEJpbmRpbmdJZGVudGlmaWVyKHRlcm0pIHtcbiAgICByZXR1cm4gdGVybTtcbiAgfVxuXG4gIGV4cGFuZEJpbmRpbmdQcm9wZXJ0eUlkZW50aWZpZXIodGVybSkge1xuICAgIHJldHVybiB0ZXJtO1xuICB9XG4gIGV4cGFuZEJpbmRpbmdQcm9wZXJ0eVByb3BlcnR5KHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuQmluZGluZ1Byb3BlcnR5UHJvcGVydHkoe1xuICAgICAgbmFtZTogdGhpcy5leHBhbmQodGVybS5uYW1lKSxcbiAgICAgIGJpbmRpbmc6IHRoaXMuZXhwYW5kKHRlcm0uYmluZGluZylcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZENvbXB1dGVkUHJvcGVydHlOYW1lKHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuQ29tcHV0ZWRQcm9wZXJ0eU5hbWUoe1xuICAgICAgZXhwcmVzc2lvbjogdGhpcy5leHBhbmQodGVybS5leHByZXNzaW9uKVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kT2JqZWN0QmluZGluZyh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULk9iamVjdEJpbmRpbmcoe1xuICAgICAgcHJvcGVydGllczogdGVybS5wcm9wZXJ0aWVzLm1hcCh0ID0+IHRoaXMuZXhwYW5kKHQpKS50b0FycmF5KClcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZEFycmF5QmluZGluZyh0ZXJtKSB7XG4gICAgbGV0IHJlc3RFbGVtZW50ID0gdGVybS5yZXN0RWxlbWVudCA9PSBudWxsID8gbnVsbCA6IHRoaXMuZXhwYW5kKHRlcm0ucmVzdEVsZW1lbnQpO1xuICAgIHJldHVybiBuZXcgVC5BcnJheUJpbmRpbmcoe1xuICAgICAgZWxlbWVudHM6IHRlcm0uZWxlbWVudHMubWFwKHQgPT4gdCA9PSBudWxsID8gbnVsbCA6IHRoaXMuZXhwYW5kKHQpKS50b0FycmF5KCksXG4gICAgICByZXN0RWxlbWVudFxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kQmluZGluZ1dpdGhEZWZhdWx0KHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuQmluZGluZ1dpdGhEZWZhdWx0KHtcbiAgICAgIGJpbmRpbmc6IHRoaXMuZXhwYW5kKHRlcm0uYmluZGluZyksXG4gICAgICBpbml0OiB0aGlzLmV4cGFuZCh0ZXJtLmluaXQpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRTaG9ydGhhbmRQcm9wZXJ0eSh0ZXJtKSB7XG4gICAgLy8gYmVjYXVzZSBoeWdpZW5lLCBzaG9ydGhhbmQgcHJvcGVydGllcyBtdXN0IHR1cm4gaW50byBEYXRhUHJvcGVydGllc1xuICAgIHJldHVybiBuZXcgVC5EYXRhUHJvcGVydHkoe1xuICAgICAgbmFtZTogbmV3IFQuU3RhdGljUHJvcGVydHlOYW1lKHtcbiAgICAgICAgdmFsdWU6IHRlcm0ubmFtZVxuICAgICAgfSksXG4gICAgICBleHByZXNzaW9uOiBuZXcgVC5JZGVudGlmaWVyRXhwcmVzc2lvbih7XG4gICAgICAgIG5hbWU6IHRlcm0ubmFtZVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuXG5cbiAgZXhwYW5kRm9yU3RhdGVtZW50KHRlcm0pIHtcbiAgICBsZXQgaW5pdCA9IHRlcm0uaW5pdCA9PSBudWxsID8gbnVsbCA6IHRoaXMuZXhwYW5kKHRlcm0uaW5pdCk7XG4gICAgbGV0IHRlc3QgPSB0ZXJtLnRlc3QgPT0gbnVsbCA/IG51bGwgOiB0aGlzLmV4cGFuZCh0ZXJtLnRlc3QpO1xuICAgIGxldCB1cGRhdGUgPSB0ZXJtLnVwZGF0ZSA9PSBudWxsID8gbnVsbCA6IHRoaXMuZXhwYW5kKHRlcm0udXBkYXRlKTtcbiAgICBsZXQgYm9keSA9IHRoaXMuZXhwYW5kKHRlcm0uYm9keSk7XG4gICAgcmV0dXJuIG5ldyBULkZvclN0YXRlbWVudCh7IGluaXQsIHRlc3QsIHVwZGF0ZSwgYm9keSB9KTtcbiAgfVxuXG4gIGV4cGFuZFlpZWxkRXhwcmVzc2lvbih0ZXJtKSB7XG4gICAgbGV0IGV4cHIgPSB0ZXJtLmV4cHJlc3Npb24gPT0gbnVsbCA/IG51bGwgOiB0aGlzLmV4cGFuZCh0ZXJtLmV4cHJlc3Npb24pO1xuICAgIHJldHVybiBuZXcgVC5ZaWVsZEV4cHJlc3Npb24oe1xuICAgICAgZXhwcmVzc2lvbjogZXhwclxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kWWllbGRHZW5lcmF0b3JFeHByZXNzaW9uKHRlcm0pIHtcbiAgICBsZXQgZXhwciA9IHRlcm0uZXhwcmVzc2lvbiA9PSBudWxsID8gbnVsbCA6IHRoaXMuZXhwYW5kKHRlcm0uZXhwcmVzc2lvbik7XG4gICAgcmV0dXJuIG5ldyBULllpZWxkR2VuZXJhdG9yRXhwcmVzc2lvbih7XG4gICAgICBleHByZXNzaW9uOiBleHByXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRXaGlsZVN0YXRlbWVudCh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULldoaWxlU3RhdGVtZW50KHtcbiAgICAgIHRlc3Q6IHRoaXMuZXhwYW5kKHRlcm0udGVzdCksXG4gICAgICBib2R5OiB0aGlzLmV4cGFuZCh0ZXJtLmJvZHkpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRJZlN0YXRlbWVudCh0ZXJtKSB7XG4gICAgbGV0IGNvbnNlcXVlbnQgPSB0ZXJtLmNvbnNlcXVlbnQgPT0gbnVsbCA/IG51bGwgOiB0aGlzLmV4cGFuZCh0ZXJtLmNvbnNlcXVlbnQpO1xuICAgIGxldCBhbHRlcm5hdGUgPSB0ZXJtLmFsdGVybmF0ZSA9PSBudWxsID8gbnVsbCA6IHRoaXMuZXhwYW5kKHRlcm0uYWx0ZXJuYXRlKTtcbiAgICByZXR1cm4gbmV3IFQuSWZTdGF0ZW1lbnQoe1xuICAgICAgdGVzdDogdGhpcy5leHBhbmQodGVybS50ZXN0KSxcbiAgICAgIGNvbnNlcXVlbnQ6IGNvbnNlcXVlbnQsXG4gICAgICBhbHRlcm5hdGU6IGFsdGVybmF0ZVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kQmxvY2tTdGF0ZW1lbnQodGVybSkge1xuICAgIHJldHVybiBuZXcgVC5CbG9ja1N0YXRlbWVudCh7XG4gICAgICBibG9jazogdGhpcy5leHBhbmQodGVybS5ibG9jaylcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZEJsb2NrKHRlcm0pIHtcbiAgICBsZXQgc2NvcGUgPSBmcmVzaFNjb3BlKCdibG9jaycpO1xuICAgIHRoaXMuY29udGV4dC5jdXJyZW50U2NvcGUucHVzaChzY29wZSk7XG4gICAgbGV0IGNvbXBpbGVyID0gbmV3IENvbXBpbGVyKHRoaXMuY29udGV4dC5waGFzZSwgdGhpcy5jb250ZXh0LmVudiwgdGhpcy5jb250ZXh0LnN0b3JlLCB0aGlzLmNvbnRleHQpO1xuXG4gICAgbGV0IG1hcmtlZEJvZHksIGJvZHlUZXJtO1xuICAgIG1hcmtlZEJvZHkgPSB0ZXJtLnN0YXRlbWVudHMubWFwKGIgPT4gYi5yZWR1Y2UobmV3IFNjb3BlUmVkdWNlcihbe3Njb3BlLCBwaGFzZTogQUxMX1BIQVNFUywgZmxpcDogZmFsc2V9XSwgdGhpcy5jb250ZXh0LmJpbmRpbmdzKSkpO1xuICAgIGJvZHlUZXJtID0gbmV3IFQuQmxvY2soe1xuICAgICAgc3RhdGVtZW50czogY29tcGlsZXIuY29tcGlsZShtYXJrZWRCb2R5KVxuICAgIH0pO1xuICAgIHRoaXMuY29udGV4dC5jdXJyZW50U2NvcGUucG9wKCk7XG4gICAgcmV0dXJuIGJvZHlUZXJtO1xuICB9XG5cbiAgZXhwYW5kVmFyaWFibGVEZWNsYXJhdGlvblN0YXRlbWVudCh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULlZhcmlhYmxlRGVjbGFyYXRpb25TdGF0ZW1lbnQoe1xuICAgICAgZGVjbGFyYXRpb246IHRoaXMuZXhwYW5kKHRlcm0uZGVjbGFyYXRpb24pXG4gICAgfSk7XG4gIH1cbiAgZXhwYW5kUmV0dXJuU3RhdGVtZW50KHRlcm0pIHtcbiAgICBpZiAodGVybS5leHByZXNzaW9uID09IG51bGwpIHtcbiAgICAgIHJldHVybiB0ZXJtO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFQuUmV0dXJuU3RhdGVtZW50KHtcbiAgICAgIGV4cHJlc3Npb246IHRoaXMuZXhwYW5kKHRlcm0uZXhwcmVzc2lvbilcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZENsYXNzRGVjbGFyYXRpb24odGVybSkge1xuICAgIHJldHVybiBuZXcgVC5DbGFzc0RlY2xhcmF0aW9uKHtcbiAgICAgIG5hbWU6IHRlcm0ubmFtZSA9PSBudWxsID8gbnVsbCA6IHRoaXMuZXhwYW5kKHRlcm0ubmFtZSksXG4gICAgICBzdXBlcjogdGVybS5zdXBlciA9PSBudWxsID8gbnVsbCA6IHRoaXMuZXhwYW5kKHRlcm0uc3VwZXIpLFxuICAgICAgZWxlbWVudHM6IHRlcm0uZWxlbWVudHMubWFwKGVsID0+IHRoaXMuZXhwYW5kKGVsKSkudG9BcnJheSgpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRDbGFzc0V4cHJlc3Npb24odGVybSkge1xuICAgIHJldHVybiBuZXcgVC5DbGFzc0V4cHJlc3Npb24oe1xuICAgICAgbmFtZTogdGVybS5uYW1lID09IG51bGwgPyBudWxsIDogdGhpcy5leHBhbmQodGVybS5uYW1lKSxcbiAgICAgIHN1cGVyOiB0ZXJtLnN1cGVyID09IG51bGwgPyBudWxsIDogdGhpcy5leHBhbmQodGVybS5zdXBlciksXG4gICAgICBlbGVtZW50czogdGVybS5lbGVtZW50cy5tYXAoZWwgPT4gdGhpcy5leHBhbmQoZWwpKS50b0FycmF5KClcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZENsYXNzRWxlbWVudCh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULkNsYXNzRWxlbWVudCh7XG4gICAgICBpc1N0YXRpYzogdGVybS5pc1N0YXRpYyxcbiAgICAgIG1ldGhvZDogdGhpcy5leHBhbmQodGVybS5tZXRob2QpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRUaGlzRXhwcmVzc2lvbih0ZXJtKSB7XG4gICAgcmV0dXJuIHRlcm07XG4gIH1cblxuICBleHBhbmRTeW50YXhUZW1wbGF0ZSh0ZXJtKSB7XG4gICAgbGV0IHIgPSBwcm9jZXNzVGVtcGxhdGUodGVybS50ZW1wbGF0ZS5zbGljZSgxLCB0ZXJtLnRlbXBsYXRlLnNpemUgLSAxKSk7XG4gICAgbGV0IGlkZW50ID0gdGhpcy5jb250ZXh0LmdldFRlbXBsYXRlSWRlbnRpZmllcigpO1xuICAgIHRoaXMuY29udGV4dC50ZW1wbGF0ZU1hcC5zZXQoaWRlbnQsIHIudGVtcGxhdGUpO1xuICAgIGxldCBuYW1lID0gU3ludGF4LmZyb21JZGVudGlmaWVyKCdzeW50YXhUZW1wbGF0ZScsIHRlcm0udGVtcGxhdGUuZmlyc3QoKS52YWx1ZSk7XG4gICAgbGV0IGNhbGxlZSA9IG5ldyBULklkZW50aWZpZXJFeHByZXNzaW9uKHtcbiAgICAgIG5hbWU6IG5hbWVcbiAgICB9KTtcblxuICAgIGxldCBleHBhbmRlZEludGVycHMgPSByLmludGVycC5tYXAoaSA9PiB7XG4gICAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIoaSwgTGlzdCgpLCB0aGlzLmNvbnRleHQpO1xuICAgICAgcmV0dXJuIHRoaXMuZXhwYW5kKGVuZi5lbmZvcmVzdCgnZXhwcmVzc2lvbicpKTtcbiAgICB9KTtcblxuICAgIGxldCBhcmdzID0gTGlzdC5vZihuZXcgVC5MaXRlcmFsTnVtZXJpY0V4cHJlc3Npb24oeyB2YWx1ZTogaWRlbnQgfSkpXG4gICAgICAgICAgICAgICAgICAgLmNvbmNhdChleHBhbmRlZEludGVycHMpO1xuXG4gICAgcmV0dXJuIG5ldyBULkNhbGxFeHByZXNzaW9uKHtcbiAgICAgIGNhbGxlZSwgYXJndW1lbnRzOiBhcmdzXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRTdGF0aWNNZW1iZXJFeHByZXNzaW9uKHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuU3RhdGljTWVtYmVyRXhwcmVzc2lvbih7XG4gICAgICBvYmplY3Q6IHRoaXMuZXhwYW5kKHRlcm0ub2JqZWN0KSxcbiAgICAgIHByb3BlcnR5OiB0ZXJtLnByb3BlcnR5XG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRBcnJheUV4cHJlc3Npb24odGVybSkge1xuICAgIHJldHVybiBuZXcgVC5BcnJheUV4cHJlc3Npb24oe1xuICAgICAgZWxlbWVudHM6IHRlcm0uZWxlbWVudHMubWFwKHQgPT4gdCA9PSBudWxsID8gdCA6IHRoaXMuZXhwYW5kKHQpKVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kSW1wb3J0KHRlcm0pIHtcbiAgICByZXR1cm4gdGVybTtcbiAgfVxuXG4gIGV4cGFuZEltcG9ydE5hbWVzcGFjZSh0ZXJtKSB7XG4gICAgcmV0dXJuIHRlcm07XG4gIH1cblxuICBleHBhbmRFeHBvcnQodGVybSkge1xuICAgIHJldHVybiBuZXcgVC5FeHBvcnQoe1xuICAgICAgZGVjbGFyYXRpb246IHRoaXMuZXhwYW5kKHRlcm0uZGVjbGFyYXRpb24pXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRFeHBvcnREZWZhdWx0KHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuRXhwb3J0RGVmYXVsdCh7XG4gICAgICBib2R5OiB0aGlzLmV4cGFuZCh0ZXJtLmJvZHkpXG4gICAgfSk7XG4gIH1cblxuXG4gIGV4cGFuZEV4cG9ydEZyb20odGVybSkge1xuICAgIHJldHVybiB0ZXJtO1xuICB9XG5cbiAgZXhwYW5kRXhwb3J0QWxsRnJvbSh0ZXJtKSB7XG4gICAgcmV0dXJuIHRlcm07XG4gIH1cblxuICBleHBhbmRFeHBvcnRTcGVjaWZpZXIodGVybSkge1xuICAgIHJldHVybiB0ZXJtO1xuICB9XG5cbiAgZXhwYW5kU3RhdGljUHJvcGVydHlOYW1lKHRlcm0pIHtcbiAgICByZXR1cm4gdGVybTtcbiAgfVxuXG4gIGV4cGFuZERhdGFQcm9wZXJ0eSh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULkRhdGFQcm9wZXJ0eSh7XG4gICAgICBuYW1lOiB0aGlzLmV4cGFuZCh0ZXJtLm5hbWUpLFxuICAgICAgZXhwcmVzc2lvbjogdGhpcy5leHBhbmQodGVybS5leHByZXNzaW9uKVxuICAgIH0pO1xuICB9XG5cblxuICBleHBhbmRPYmplY3RFeHByZXNzaW9uKHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuT2JqZWN0RXhwcmVzc2lvbih7XG4gICAgICBwcm9wZXJ0aWVzOiB0ZXJtLnByb3BlcnRpZXMubWFwKHQgPT4gdGhpcy5leHBhbmQodCkpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRWYXJpYWJsZURlY2xhcmF0b3IodGVybSkge1xuICAgIGxldCBpbml0ID0gdGVybS5pbml0ID09IG51bGwgPyBudWxsIDogdGhpcy5leHBhbmQodGVybS5pbml0KTtcbiAgICByZXR1cm4gbmV3IFQuVmFyaWFibGVEZWNsYXJhdG9yKHtcbiAgICAgIGJpbmRpbmc6IHRoaXMuZXhwYW5kKHRlcm0uYmluZGluZyksXG4gICAgICBpbml0OiBpbml0XG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRWYXJpYWJsZURlY2xhcmF0aW9uKHRlcm0pIHtcbiAgICBpZiAodGVybS5raW5kID09PSAnc3ludGF4JyB8fCB0ZXJtLmtpbmQgPT09ICdzeW50YXhyZWMnKSB7XG4gICAgICByZXR1cm4gdGVybTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBULlZhcmlhYmxlRGVjbGFyYXRpb24oe1xuICAgICAga2luZDogdGVybS5raW5kLFxuICAgICAgZGVjbGFyYXRvcnM6IHRlcm0uZGVjbGFyYXRvcnMubWFwKGQgPT4gdGhpcy5leHBhbmQoZCkpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRQYXJlbnRoZXNpemVkRXhwcmVzc2lvbih0ZXJtKSB7XG4gICAgaWYgKHRlcm0uaW5uZXIuc2l6ZSA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkIGVuZCBvZiBpbnB1dCcpO1xuICAgIH1cbiAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIodGVybS5pbm5lciwgTGlzdCgpLCB0aGlzLmNvbnRleHQpO1xuICAgIGxldCBsb29rYWhlYWQgPSBlbmYucGVlaygpO1xuICAgIGxldCB0ID0gZW5mLmVuZm9yZXN0RXhwcmVzc2lvbigpO1xuICAgIGlmICh0ID09IG51bGwgfHwgZW5mLnJlc3Quc2l6ZSA+IDApIHtcbiAgICAgIHRocm93IGVuZi5jcmVhdGVFcnJvcihsb29rYWhlYWQsICd1bmV4cGVjdGVkIHN5bnRheCcpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5leHBhbmQodCk7XG4gIH1cblxuICBleHBhbmRVbmFyeUV4cHJlc3Npb24odGVybSkge1xuICAgIHJldHVybiBuZXcgVC5VbmFyeUV4cHJlc3Npb24oe1xuICAgICAgb3BlcmF0b3I6IHRlcm0ub3BlcmF0b3IsXG4gICAgICBvcGVyYW5kOiB0aGlzLmV4cGFuZCh0ZXJtLm9wZXJhbmQpXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRVcGRhdGVFeHByZXNzaW9uKHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuVXBkYXRlRXhwcmVzc2lvbih7XG4gICAgICBpc1ByZWZpeDogdGVybS5pc1ByZWZpeCxcbiAgICAgIG9wZXJhdG9yOiB0ZXJtLm9wZXJhdG9yLFxuICAgICAgb3BlcmFuZDogdGhpcy5leHBhbmQodGVybS5vcGVyYW5kKVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kQmluYXJ5RXhwcmVzc2lvbih0ZXJtKSB7XG4gICAgbGV0IGxlZnQgPSB0aGlzLmV4cGFuZCh0ZXJtLmxlZnQpO1xuICAgIGxldCByaWdodCA9IHRoaXMuZXhwYW5kKHRlcm0ucmlnaHQpO1xuICAgIHJldHVybiBuZXcgVC5CaW5hcnlFeHByZXNzaW9uKHtcbiAgICAgIGxlZnQ6IGxlZnQsXG4gICAgICBvcGVyYXRvcjogdGVybS5vcGVyYXRvcixcbiAgICAgIHJpZ2h0OiByaWdodFxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kQ29uZGl0aW9uYWxFeHByZXNzaW9uKHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuQ29uZGl0aW9uYWxFeHByZXNzaW9uKHtcbiAgICAgIHRlc3Q6IHRoaXMuZXhwYW5kKHRlcm0udGVzdCksXG4gICAgICBjb25zZXF1ZW50OiB0aGlzLmV4cGFuZCh0ZXJtLmNvbnNlcXVlbnQpLFxuICAgICAgYWx0ZXJuYXRlOiB0aGlzLmV4cGFuZCh0ZXJtLmFsdGVybmF0ZSlcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZE5ld1RhcmdldEV4cHJlc3Npb24odGVybSkgeyByZXR1cm4gdGVybTsgfVxuXG4gIGV4cGFuZE5ld0V4cHJlc3Npb24odGVybSkge1xuICAgIGxldCBjYWxsZWUgPSB0aGlzLmV4cGFuZCh0ZXJtLmNhbGxlZSk7XG4gICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKHRlcm0uYXJndW1lbnRzLCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG4gICAgbGV0IGFyZ3MgPSBlbmYuZW5mb3Jlc3RBcmd1bWVudExpc3QoKS5tYXAoYXJnID0+IHRoaXMuZXhwYW5kKGFyZykpO1xuICAgIHJldHVybiBuZXcgVC5OZXdFeHByZXNzaW9uKHtcbiAgICAgIGNhbGxlZSxcbiAgICAgIGFyZ3VtZW50czogYXJncy50b0FycmF5KClcbiAgICB9KTtcbiAgfVxuXG4gIGV4cGFuZFN1cGVyKHRlcm0pIHsgcmV0dXJuIHRlcm07IH1cblxuICBleHBhbmRDYWxsRXhwcmVzc2lvbkUodGVybSkge1xuICAgIGxldCBjYWxsZWUgPSB0aGlzLmV4cGFuZCh0ZXJtLmNhbGxlZSk7XG4gICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKHRlcm0uYXJndW1lbnRzLCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG4gICAgbGV0IGFyZ3MgPSBlbmYuZW5mb3Jlc3RBcmd1bWVudExpc3QoKS5tYXAoYXJnID0+IHRoaXMuZXhwYW5kKGFyZykpO1xuICAgIHJldHVybiBuZXcgVC5DYWxsRXhwcmVzc2lvbih7XG4gICAgICBjYWxsZWU6IGNhbGxlZSxcbiAgICAgIGFyZ3VtZW50czogYXJnc1xuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kU3ByZWFkRWxlbWVudCh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULlNwcmVhZEVsZW1lbnQoe1xuICAgICAgZXhwcmVzc2lvbjogdGhpcy5leHBhbmQodGVybS5leHByZXNzaW9uKVxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kRXhwcmVzc2lvblN0YXRlbWVudCh0ZXJtKSB7XG4gICAgbGV0IGNoaWxkID0gdGhpcy5leHBhbmQodGVybS5leHByZXNzaW9uKTtcbiAgICByZXR1cm4gbmV3IFQuRXhwcmVzc2lvblN0YXRlbWVudCh7XG4gICAgICBleHByZXNzaW9uOiBjaGlsZFxuICAgIH0pO1xuICB9XG5cbiAgZXhwYW5kTGFiZWxlZFN0YXRlbWVudCh0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULkxhYmVsZWRTdGF0ZW1lbnQoe1xuICAgICAgbGFiZWw6IHRlcm0ubGFiZWwudmFsKCksXG4gICAgICBib2R5OiB0aGlzLmV4cGFuZCh0ZXJtLmJvZHkpXG4gICAgfSk7XG4gIH1cblxuICBkb0Z1bmN0aW9uRXhwYW5zaW9uKHRlcm0sIHR5cGUpIHtcbiAgICBsZXQgc2NvcGUgPSBmcmVzaFNjb3BlKCdmdW4nKTtcbiAgICBsZXQgcGFyYW1zO1xuICAgIGxldCBzZWxmID0gdGhpcztcbiAgICBpZiAodHlwZSAhPT0gJ0dldHRlcicgJiYgdHlwZSAhPT0gJ1NldHRlcicpIHtcbiAgICAgIC8vIFRPRE86IG5lZWQgdG8gcmVnaXN0ZXIgdGhlIHBhcmFtZXRlciBiaW5kaW5ncyBhZ2FpblxuICAgICAgcGFyYW1zID0gdGVybS5wYXJhbXMucmVkdWNlKG5ldyBjbGFzcyBleHRlbmRzIFRlcm0uQ2xvbmVSZWR1Y2VyIHtcbiAgICAgICAgcmVkdWNlQmluZGluZ0lkZW50aWZpZXIodGVybSkge1xuICAgICAgICAgIGxldCBuYW1lID0gdGVybS5uYW1lLmFkZFNjb3BlKHNjb3BlLCBzZWxmLmNvbnRleHQuYmluZGluZ3MsIEFMTF9QSEFTRVMpO1xuICAgICAgICAgIGxldCBuZXdCaW5kaW5nID0gZ2Vuc3ltKG5hbWUudmFsKCkpO1xuXG4gICAgICAgICAgc2VsZi5jb250ZXh0LmVudi5zZXQobmV3QmluZGluZy50b1N0cmluZygpLCBuZXcgVmFyQmluZGluZ1RyYW5zZm9ybShuYW1lKSk7XG4gICAgICAgICAgc2VsZi5jb250ZXh0LmJpbmRpbmdzLmFkZChuYW1lLCB7XG4gICAgICAgICAgICBiaW5kaW5nOiBuZXdCaW5kaW5nLFxuICAgICAgICAgICAgcGhhc2U6IHNlbGYuY29udGV4dC5waGFzZSxcbiAgICAgICAgICAgIHNraXBEdXA6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gbmV3IFQuQmluZGluZ0lkZW50aWZpZXIoeyBuYW1lIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHBhcmFtcyA9IHRoaXMuZXhwYW5kKHBhcmFtcyk7XG4gICAgfVxuICAgIHRoaXMuY29udGV4dC5jdXJyZW50U2NvcGUucHVzaChzY29wZSk7XG4gICAgbGV0IGNvbXBpbGVyID0gbmV3IENvbXBpbGVyKHRoaXMuY29udGV4dC5waGFzZSwgdGhpcy5jb250ZXh0LmVudiwgdGhpcy5jb250ZXh0LnN0b3JlLCB0aGlzLmNvbnRleHQpO1xuXG4gICAgbGV0IGJvZHlUZXJtO1xuICAgIGxldCBzY29wZVJlZHVjZXIgPSBuZXcgU2NvcGVSZWR1Y2VyKFt7IHNjb3BlLCBwaGFzZTogQUxMX1BIQVNFUywgZmxpcDogZmFsc2UgfV0sIHRoaXMuY29udGV4dC5iaW5kaW5ncyk7XG4gICAgaWYgKHRlcm0uYm9keSBpbnN0YW5jZW9mIFRlcm0pIHtcbiAgICAgIC8vIEFycm93IGZ1bmN0aW9ucyBoYXZlIGEgc2luZ2xlIHRlcm0gYXMgdGhlaXIgYm9keVxuICAgICAgYm9keVRlcm0gPSB0aGlzLmV4cGFuZCh0ZXJtLmJvZHkucmVkdWNlKHNjb3BlUmVkdWNlcikpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgY29tcGlsZWRCb2R5ID0gY29tcGlsZXIuY29tcGlsZShcbiAgICAgICAgdGVybS5ib2R5Lm1hcChiID0+IGIucmVkdWNlKHNjb3BlUmVkdWNlcikpXG4gICAgICApO1xuICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IGNvbXBpbGVkQm9keVxuICAgICAgICAgICAgLnRha2VXaGlsZShzID0+IGlzRXhwcmVzc2lvblN0YXRlbWVudChzKSAmJiBpc0xpdGVyYWxTdHJpbmdFeHByZXNzaW9uKHMuZXhwcmVzc2lvbikpXG4gICAgICAgICAgICAubWFwKHMgPT4gbmV3IFQuRGlyZWN0aXZlKHsgcmF3VmFsdWU6IHMuZXhwcmVzc2lvbi52YWx1ZSB9KSk7XG4gICAgICBib2R5VGVybSA9IG5ldyBULkZ1bmN0aW9uQm9keSh7XG4gICAgICAgIGRpcmVjdGl2ZXM6IGRpcmVjdGl2ZXMsXG4gICAgICAgIHN0YXRlbWVudHM6IGNvbXBpbGVkQm9keS5zbGljZShkaXJlY3RpdmVzLnNpemUpXG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5jb250ZXh0LmN1cnJlbnRTY29wZS5wb3AoKTtcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnR2V0dGVyJzpcbiAgICAgICAgcmV0dXJuIG5ldyBULkdldHRlcih7XG4gICAgICAgICAgbmFtZTogdGhpcy5leHBhbmQodGVybS5uYW1lKSxcbiAgICAgICAgICBib2R5OiBib2R5VGVybVxuICAgICAgICB9KTtcbiAgICAgIGNhc2UgJ1NldHRlcic6XG4gICAgICAgIHJldHVybiBuZXcgVC5TZXR0ZXIoe1xuICAgICAgICAgIG5hbWU6IHRoaXMuZXhwYW5kKHRlcm0ubmFtZSksXG4gICAgICAgICAgcGFyYW06IHRlcm0ucGFyYW0sXG4gICAgICAgICAgYm9keTogYm9keVRlcm1cbiAgICAgICAgfSk7XG4gICAgICBjYXNlICdNZXRob2QnOlxuICAgICAgICByZXR1cm4gbmV3IFQuTWV0aG9kKHtcbiAgICAgICAgICBuYW1lOiB0ZXJtLm5hbWUsXG4gICAgICAgICAgaXNHZW5lcmF0b3I6IHRlcm0uaXNHZW5lcmF0b3IsXG4gICAgICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICAgICAgYm9keTogYm9keVRlcm1cbiAgICAgICAgfSk7XG4gICAgICBjYXNlICdBcnJvd0V4cHJlc3Npb24nOlxuICAgICAgICByZXR1cm4gbmV3IFQuQXJyb3dFeHByZXNzaW9uKHtcbiAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICBib2R5OiBib2R5VGVybVxuICAgICAgICB9KTtcbiAgICAgIGNhc2UgJ0Z1bmN0aW9uRXhwcmVzc2lvbic6XG4gICAgICAgIHJldHVybiBuZXcgVC5GdW5jdGlvbkV4cHJlc3Npb24oe1xuICAgICAgICAgIG5hbWU6IHRlcm0ubmFtZSxcbiAgICAgICAgICBpc0dlbmVyYXRvcjogdGVybS5pc0dlbmVyYXRvcixcbiAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICBib2R5OiBib2R5VGVybVxuICAgICAgICB9KTtcbiAgICAgIGNhc2UgJ0Z1bmN0aW9uRGVjbGFyYXRpb24nOlxuICAgICAgICByZXR1cm4gbmV3IFQuRnVuY3Rpb25EZWNsYXJhdGlvbih7XG4gICAgICAgICAgbmFtZTogdGVybS5uYW1lLFxuICAgICAgICAgIGlzR2VuZXJhdG9yOiB0ZXJtLmlzR2VuZXJhdG9yLFxuICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgIGJvZHk6IGJvZHlUZXJtXG4gICAgICAgIH0pO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGZ1bmN0aW9uIHR5cGU6ICR7dHlwZX1gKTtcbiAgICB9XG4gIH1cblxuICBleHBhbmRNZXRob2QodGVybSkge1xuICAgIHJldHVybiB0aGlzLmRvRnVuY3Rpb25FeHBhbnNpb24odGVybSwgJ01ldGhvZCcpO1xuICB9XG5cbiAgZXhwYW5kU2V0dGVyKHRlcm0pIHtcbiAgICByZXR1cm4gdGhpcy5kb0Z1bmN0aW9uRXhwYW5zaW9uKHRlcm0sICdTZXR0ZXInKTtcbiAgfVxuXG4gIGV4cGFuZEdldHRlcih0ZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuZG9GdW5jdGlvbkV4cGFuc2lvbih0ZXJtLCAnR2V0dGVyJyk7XG4gIH1cblxuICBleHBhbmRGdW5jdGlvbkRlY2xhcmF0aW9uRSh0ZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuZG9GdW5jdGlvbkV4cGFuc2lvbih0ZXJtLCAnRnVuY3Rpb25EZWNsYXJhdGlvbicpO1xuICB9XG5cbiAgZXhwYW5kRnVuY3Rpb25FeHByZXNzaW9uRSh0ZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuZG9GdW5jdGlvbkV4cGFuc2lvbih0ZXJtLCAnRnVuY3Rpb25FeHByZXNzaW9uJyk7XG4gIH1cblxuICBleHBhbmRDb21wb3VuZEFzc2lnbm1lbnRFeHByZXNzaW9uKHRlcm0pIHtcbiAgICByZXR1cm4gbmV3IFQuQ29tcG91bmRBc3NpZ25tZW50RXhwcmVzc2lvbih7XG4gICAgICBiaW5kaW5nOiB0aGlzLmV4cGFuZCh0ZXJtLmJpbmRpbmcpLFxuICAgICAgb3BlcmF0b3I6IHRlcm0ub3BlcmF0b3IsXG4gICAgICBleHByZXNzaW9uOiB0aGlzLmV4cGFuZCh0ZXJtLmV4cHJlc3Npb24pXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRBc3NpZ25tZW50RXhwcmVzc2lvbih0ZXJtKSB7XG4gICAgcmV0dXJuIG5ldyBULkFzc2lnbm1lbnRFeHByZXNzaW9uKHtcbiAgICAgIGJpbmRpbmc6IHRoaXMuZXhwYW5kKHRlcm0uYmluZGluZyksXG4gICAgICBleHByZXNzaW9uOiB0aGlzLmV4cGFuZCh0ZXJtLmV4cHJlc3Npb24pXG4gICAgfSk7XG4gIH1cblxuICBleHBhbmRFbXB0eVN0YXRlbWVudCh0ZXJtKSB7XG4gICAgcmV0dXJuIHRlcm07XG4gIH1cblxuICBleHBhbmRMaXRlcmFsQm9vbGVhbkV4cHJlc3Npb24odGVybSkge1xuICAgIHJldHVybiB0ZXJtO1xuICB9XG5cbiAgZXhwYW5kTGl0ZXJhbE51bWVyaWNFeHByZXNzaW9uKHRlcm0pIHtcbiAgICByZXR1cm4gdGVybTtcbiAgfVxuICBleHBhbmRMaXRlcmFsSW5maW5pdHlFeHByZXNzaW9uKHRlcm0pIHtcbiAgICByZXR1cm4gdGVybTtcbiAgfVxuXG4gIGV4cGFuZElkZW50aWZpZXJFeHByZXNzaW9uKHRlcm0pIHtcbiAgICBsZXQgdHJhbnMgPSB0aGlzLmNvbnRleHQuZW52LmdldCh0ZXJtLm5hbWUucmVzb2x2ZSh0aGlzLmNvbnRleHQucGhhc2UpKTtcbiAgICBpZiAodHJhbnMpIHtcbiAgICAgIHJldHVybiBuZXcgVC5JZGVudGlmaWVyRXhwcmVzc2lvbih7XG4gICAgICAgIG5hbWU6IHRyYW5zLmlkXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRlcm07XG4gIH1cblxuICBleHBhbmRMaXRlcmFsTnVsbEV4cHJlc3Npb24odGVybSkge1xuICAgIHJldHVybiB0ZXJtO1xuICB9XG5cbiAgZXhwYW5kTGl0ZXJhbFN0cmluZ0V4cHJlc3Npb24odGVybSkge1xuICAgIHJldHVybiB0ZXJtO1xuICB9XG5cbiAgZXhwYW5kTGl0ZXJhbFJlZ0V4cEV4cHJlc3Npb24odGVybSkge1xuICAgIHJldHVybiB0ZXJtO1xuICB9XG59XG4iXX0=