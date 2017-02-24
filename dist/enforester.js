'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Enforester = undefined;

var _terms = require('./terms');

var _sweetSpec = require('sweet-spec');

var T = _interopRequireWildcard(_sweetSpec);

var _ramdaFantasy = require('ramda-fantasy');

var _scopeReducer = require('./scope-reducer');

var _scopeReducer2 = _interopRequireDefault(_scopeReducer);

var _transforms = require('./transforms');

var _immutable = require('immutable');

var _errors = require('./errors');

var _operators = require('./operators');

var _syntax = require('./syntax');

var _syntax2 = _interopRequireDefault(_syntax);

var _scope = require('./scope');

var _loadSyntax = require('./load-syntax');

var _macroContext = require('./macro-context');

var _macroContext2 = _interopRequireDefault(_macroContext);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

const Just = _ramdaFantasy.Maybe.Just;
const Nothing = _ramdaFantasy.Maybe.Nothing;

const EXPR_LOOP_OPERATOR = {};
const EXPR_LOOP_NO_CHANGE = {};
const EXPR_LOOP_EXPANSION = {};

function getLineNumber(x) {
  let stx;
  if (x instanceof _syntax2.default) {
    stx = x;
  } else if (x instanceof T.RawSyntax) {
    stx = x.value;
  } else if (x instanceof T.RawDelimiter) {
    return getLineNumber(x.inner.first());
  } else {
    throw new Error(`Not implemented yet ${ x }`);
  }
  return stx.lineNumber();
}

class Enforester {

  constructor(stxl, prev, context) {
    this.done = false;
    (0, _errors.assert)(_immutable.List.isList(stxl), 'expecting a list of terms to enforest');
    (0, _errors.assert)(_immutable.List.isList(prev), 'expecting a list of terms to enforest');
    (0, _errors.assert)(context, 'expecting a context to enforest');
    this.term = null;

    this.rest = stxl;
    this.prev = prev;

    this.context = context;
  }

  peek(n = 0) {
    return this.rest.get(n);
  }

  advance() {
    let ret = this.rest.first();
    this.rest = this.rest.rest();
    return ret;
  }

  /*
   enforest works over:
   prev - a list of the previously enforest Terms
   term - the current term being enforested (initially null)
   rest - remaining Terms to enforest
   */
  enforest(type = 'Module') {
    // initialize the term
    this.term = null;

    if (this.rest.size === 0) {
      this.done = true;
      return this.term;
    }

    if (this.isEOF(this.peek())) {
      this.term = new T.EOF({});
      this.advance();
      return this.term;
    }

    let result;
    if (type === 'expression') {
      result = this.enforestExpressionLoop();
    } else {
      result = this.enforestModule();
    }

    if (this.rest.size === 0) {
      this.done = true;
    }
    return result;
  }

  enforestModule() {
    return this.enforestBody();
  }

  enforestBody() {
    return this.enforestModuleItem();
  }

  enforestModuleItem() {
    let lookahead = this.peek();
    if (this.isKeyword(lookahead, 'import')) {
      this.advance();
      return this.enforestImportDeclaration();
    } else if (this.isKeyword(lookahead, 'export')) {
      this.advance();
      return this.enforestExportDeclaration();
    }
    return this.enforestStatement();
  }

  enforestExportDeclaration() {
    let lookahead = this.peek();
    if (this.isPunctuator(lookahead, '*')) {
      this.advance();
      let moduleSpecifier = this.enforestFromClause();
      return new T.ExportAllFrom({ moduleSpecifier });
    } else if (this.isBraces(lookahead)) {
      let namedExports = this.enforestExportClause();
      let moduleSpecifier = null;
      if (this.isIdentifier(this.peek(), 'from')) {
        moduleSpecifier = this.enforestFromClause();
      }
      return new T.ExportFrom({ namedExports, moduleSpecifier });
    } else if (this.isKeyword(lookahead, 'class')) {
      return new T.Export({
        declaration: this.enforestClass({ isExpr: false })
      });
    } else if (this.isFnDeclTransform(lookahead)) {
      return new T.Export({
        declaration: this.enforestFunction({ isExpr: false })
      });
    } else if (this.isKeyword(lookahead, 'default')) {
      this.advance();
      if (this.isFnDeclTransform(this.peek())) {
        return new T.ExportDefault({
          body: this.enforestFunction({ isExpr: false, inDefault: true })
        });
      } else if (this.isKeyword(this.peek(), 'class')) {
        return new T.ExportDefault({
          body: this.enforestClass({ isExpr: false, inDefault: true })
        });
      } else {
        let body = this.enforestExpressionLoop();
        this.consumeSemicolon();
        return new T.ExportDefault({ body });
      }
    } else if (this.isVarDeclTransform(lookahead) || this.isLetDeclTransform(lookahead) || this.isConstDeclTransform(lookahead) || this.isSyntaxrecDeclTransform(lookahead) || this.isSyntaxDeclTransform(lookahead)) {
      return new T.Export({
        declaration: this.enforestVariableDeclaration()
      });
    }
    throw this.createError(lookahead, 'unexpected syntax');
  }

  enforestExportClause() {
    let enf = new Enforester(this.matchCurlies(), (0, _immutable.List)(), this.context);
    let result = [];
    while (enf.rest.size !== 0) {
      result.push(enf.enforestExportSpecifier());
      enf.consumeComma();
    }
    return (0, _immutable.List)(result);
  }

  enforestExportSpecifier() {
    let name = this.enforestIdentifier();
    if (this.isIdentifier(this.peek(), 'as')) {
      this.advance();
      let exportedName = this.enforestIdentifier();
      return new T.ExportSpecifier({ name, exportedName });
    }
    return new T.ExportSpecifier({
      name: null,
      exportedName: name
    });
  }

  enforestImportDeclaration() {
    let lookahead = this.peek();
    let defaultBinding = null;
    let namedImports = (0, _immutable.List)();
    let forSyntax = false;

    if (this.isStringLiteral(lookahead)) {
      let moduleSpecifier = this.advance();
      this.consumeSemicolon();
      return new T.Import({
        defaultBinding,
        namedImports,
        moduleSpecifier,
        forSyntax
      });
    }

    if (this.isIdentifier(lookahead) || this.isKeyword(lookahead)) {
      defaultBinding = this.enforestBindingIdentifier();
      if (!this.isPunctuator(this.peek(), ',')) {
        let moduleSpecifier = this.enforestFromClause();
        if (this.isKeyword(this.peek(), 'for') && this.isIdentifier(this.peek(1), 'syntax')) {
          this.advance();
          this.advance();
          forSyntax = true;
        }

        return new T.Import({
          defaultBinding, moduleSpecifier,
          namedImports: (0, _immutable.List)(),
          forSyntax
        });
      }
    }
    this.consumeComma();
    lookahead = this.peek();
    if (this.isBraces(lookahead)) {
      let imports = this.enforestNamedImports();
      let fromClause = this.enforestFromClause();
      if (this.isKeyword(this.peek(), 'for') && this.isIdentifier(this.peek(1), 'syntax')) {
        this.advance();
        this.advance();
        forSyntax = true;
      }

      return new T.Import({
        defaultBinding,
        forSyntax,
        namedImports: imports,
        moduleSpecifier: fromClause

      });
    } else if (this.isPunctuator(lookahead, '*')) {
      let namespaceBinding = this.enforestNamespaceBinding();
      let moduleSpecifier = this.enforestFromClause();
      if (this.isKeyword(this.peek(), 'for') && this.isIdentifier(this.peek(1), 'syntax')) {
        this.advance();
        this.advance();
        forSyntax = true;
      }
      return new T.ImportNamespace({
        defaultBinding, forSyntax, namespaceBinding, moduleSpecifier
      });
    }
    throw this.createError(lookahead, 'unexpected syntax');
  }

  enforestNamespaceBinding() {
    this.matchPunctuator('*');
    this.matchIdentifier('as');
    return this.enforestBindingIdentifier();
  }

  enforestNamedImports() {
    let enf = new Enforester(this.matchCurlies(), (0, _immutable.List)(), this.context);
    let result = [];
    while (enf.rest.size !== 0) {
      result.push(enf.enforestImportSpecifiers());
      enf.consumeComma();
    }
    return (0, _immutable.List)(result);
  }

  enforestImportSpecifiers() {
    let lookahead = this.peek();
    let name;
    if (this.isIdentifier(lookahead) || this.isKeyword(lookahead)) {
      name = this.matchRawSyntax();
      if (!this.isIdentifier(this.peek(), 'as')) {
        return new T.ImportSpecifier({
          name: null,
          binding: new T.BindingIdentifier({
            name: name
          })
        });
      } else {
        this.matchIdentifier('as');
      }
    } else {
      throw this.createError(lookahead, 'unexpected token in import specifier');
    }
    return new T.ImportSpecifier({
      name, binding: this.enforestBindingIdentifier()
    });
  }

  enforestFromClause() {
    this.matchIdentifier('from');
    let lookahead = this.matchStringLiteral();
    this.consumeSemicolon();
    return lookahead;
  }

  enforestStatementListItem() {
    let lookahead = this.peek();

    if (this.isFnDeclTransform(lookahead)) {
      return this.enforestFunction({ isExpr: false });
    } else if (this.isKeyword(lookahead, 'class')) {
      return this.enforestClass({ isExpr: false });
    } else {
      return this.enforestStatement();
    }
  }

  enforestStatement() {
    let lookahead = this.peek();

    if (this.term === null && this.isCompiletimeTransform(lookahead)) {
      this.expandMacro();
      lookahead = this.peek();
    }

    if (this.term === null && this.isTerm(lookahead) && lookahead instanceof T.Statement) {
      // TODO: check that this is actually an statement
      return this.advance();
    }

    if (this.term === null && this.isBraces(lookahead)) {
      return this.enforestBlockStatement();
    }

    if (this.term === null && this.isWhileTransform(lookahead)) {
      return this.enforestWhileStatement();
    }

    if (this.term === null && this.isIfTransform(lookahead)) {
      return this.enforestIfStatement();
    }
    if (this.term === null && this.isForTransform(lookahead)) {
      return this.enforestForStatement();
    }
    if (this.term === null && this.isSwitchTransform(lookahead)) {
      return this.enforestSwitchStatement();
    }
    if (this.term === null && this.isBreakTransform(lookahead)) {
      return this.enforestBreakStatement();
    }
    if (this.term === null && this.isContinueTransform(lookahead)) {
      return this.enforestContinueStatement();
    }
    if (this.term === null && this.isDoTransform(lookahead)) {
      return this.enforestDoStatement();
    }
    if (this.term === null && this.isDebuggerTransform(lookahead)) {
      return this.enforestDebuggerStatement();
    }
    if (this.term === null && this.isWithTransform(lookahead)) {
      return this.enforestWithStatement();
    }
    if (this.term === null && this.isTryTransform(lookahead)) {
      return this.enforestTryStatement();
    }
    if (this.term === null && this.isThrowTransform(lookahead)) {
      return this.enforestThrowStatement();
    }

    // TODO: put somewhere else
    if (this.term === null && this.isKeyword(lookahead, 'class')) {
      return this.enforestClass({ isExpr: false });
    }

    if (this.term === null && this.isFnDeclTransform(lookahead)) {
      return this.enforestFunction({ isExpr: false });
    }

    if (this.term === null && this.isIdentifier(lookahead) && this.isPunctuator(this.peek(1), ':')) {
      return this.enforestLabeledStatement();
    }

    if (this.term === null && (this.isVarDeclTransform(lookahead) || this.isLetDeclTransform(lookahead) || this.isConstDeclTransform(lookahead) || this.isSyntaxrecDeclTransform(lookahead) || this.isSyntaxDeclTransform(lookahead))) {
      let stmt = new T.VariableDeclarationStatement({
        declaration: this.enforestVariableDeclaration()
      });
      this.consumeSemicolon();
      return stmt;
    }

    if (this.term === null && this.isReturnStmtTransform(lookahead)) {
      return this.enforestReturnStatement();
    }

    if (this.term === null && this.isPunctuator(lookahead, ';')) {
      this.advance();
      return new T.EmptyStatement({});
    }

    return this.enforestExpressionStatement();
  }

  enforestLabeledStatement() {
    let label = this.matchIdentifier();
    this.matchPunctuator(':');
    let stmt = this.enforestStatement();

    return new T.LabeledStatement({
      label: label,
      body: stmt
    });
  }

  enforestBreakStatement() {
    this.matchKeyword('break');
    let lookahead = this.peek();
    let label = null;
    if (this.rest.size === 0 || this.isPunctuator(lookahead, ';')) {
      this.consumeSemicolon();
      return new T.BreakStatement({ label });
    }
    if (this.isIdentifier(lookahead) || this.isKeyword(lookahead, 'yield') || this.isKeyword(lookahead, 'let')) {
      label = this.enforestIdentifier();
    }
    this.consumeSemicolon();

    return new T.BreakStatement({ label });
  }

  enforestTryStatement() {
    this.matchKeyword('try');
    let body = this.enforestBlock();
    if (this.isKeyword(this.peek(), 'catch')) {
      let catchClause = this.enforestCatchClause();
      if (this.isKeyword(this.peek(), 'finally')) {
        this.advance();
        let finalizer = this.enforestBlock();
        return new T.TryFinallyStatement({
          body, catchClause, finalizer
        });
      }
      return new T.TryCatchStatement({ body, catchClause });
    }
    if (this.isKeyword(this.peek(), 'finally')) {
      this.advance();
      let finalizer = this.enforestBlock();
      return new T.TryFinallyStatement({ body, catchClause: null, finalizer });
    }
    throw this.createError(this.peek(), 'try with no catch or finally');
  }

  enforestCatchClause() {
    this.matchKeyword('catch');
    let bindingParens = this.matchParens();
    let enf = new Enforester(bindingParens, (0, _immutable.List)(), this.context);
    let binding = enf.enforestBindingTarget();
    let body = this.enforestBlock();
    return new T.CatchClause({ binding, body });
  }

  enforestThrowStatement() {
    this.matchKeyword('throw');
    let expression = this.enforestExpression();
    this.consumeSemicolon();
    return new T.ThrowStatement({ expression });
  }

  enforestWithStatement() {
    this.matchKeyword('with');
    let objParens = this.matchParens();
    let enf = new Enforester(objParens, (0, _immutable.List)(), this.context);
    let object = enf.enforestExpression();
    let body = this.enforestStatement();
    return new T.WithStatement({ object, body });
  }

  enforestDebuggerStatement() {
    this.matchKeyword('debugger');

    return new T.DebuggerStatement({});
  }

  enforestDoStatement() {
    this.matchKeyword('do');
    let body = this.enforestStatement();
    this.matchKeyword('while');
    let testBody = this.matchParens();
    let enf = new Enforester(testBody, (0, _immutable.List)(), this.context);
    let test = enf.enforestExpression();
    this.consumeSemicolon();
    return new T.DoWhileStatement({ body, test });
  }

  enforestContinueStatement() {
    let kwd = this.matchKeyword('continue');
    let lookahead = this.peek();
    let label = null;
    if (this.rest.size === 0 || this.isPunctuator(lookahead, ';')) {
      this.consumeSemicolon();
      return new T.ContinueStatement({ label });
    }
    if (lookahead instanceof T.RawSyntax && this.lineNumberEq(kwd, lookahead) && (this.isIdentifier(lookahead) || this.isKeyword(lookahead, 'yield') || this.isKeyword(lookahead, 'let'))) {
      label = this.enforestIdentifier();
    }
    this.consumeSemicolon();

    return new T.ContinueStatement({ label });
  }

  enforestSwitchStatement() {
    this.matchKeyword('switch');
    let cond = this.matchParens();
    let enf = new Enforester(cond, (0, _immutable.List)(), this.context);
    let discriminant = enf.enforestExpression();
    let body = this.matchCurlies();

    if (body.size === 0) {
      return new T.SwitchStatement({
        discriminant: discriminant,
        cases: (0, _immutable.List)()
      });
    }
    enf = new Enforester(body, (0, _immutable.List)(), this.context);
    let cases = enf.enforestSwitchCases();
    let lookahead = enf.peek();
    if (enf.isKeyword(lookahead, 'default')) {
      let defaultCase = enf.enforestSwitchDefault();
      let postDefaultCases = enf.enforestSwitchCases();
      return new T.SwitchStatementWithDefault({
        discriminant,
        preDefaultCases: cases,
        defaultCase,
        postDefaultCases
      });
    }
    return new T.SwitchStatement({ discriminant, cases });
  }

  enforestSwitchCases() {
    let cases = [];
    while (!(this.rest.size === 0 || this.isKeyword(this.peek(), 'default'))) {
      cases.push(this.enforestSwitchCase());
    }
    return (0, _immutable.List)(cases);
  }

  enforestSwitchCase() {
    this.matchKeyword('case');
    return new T.SwitchCase({
      test: this.enforestExpression(),
      consequent: this.enforestSwitchCaseBody()
    });
  }

  enforestSwitchCaseBody() {
    this.matchPunctuator(':');
    return this.enforestStatementListInSwitchCaseBody();
  }

  enforestStatementListInSwitchCaseBody() {
    let result = [];
    while (!(this.rest.size === 0 || this.isKeyword(this.peek(), 'default') || this.isKeyword(this.peek(), 'case'))) {
      result.push(this.enforestStatementListItem());
    }
    return (0, _immutable.List)(result);
  }

  enforestSwitchDefault() {
    this.matchKeyword('default');
    return new T.SwitchDefault({
      consequent: this.enforestSwitchCaseBody()
    });
  }

  enforestForStatement() {
    this.matchKeyword('for');
    let cond = this.matchParens();
    let enf = new Enforester(cond, (0, _immutable.List)(), this.context);
    let lookahead, test, init, right, left, update, cnst;

    // case where init is null
    if (enf.isPunctuator(enf.peek(), ';')) {
      enf.advance();
      if (!enf.isPunctuator(enf.peek(), ';')) {
        test = enf.enforestExpression();
      }
      enf.matchPunctuator(';');
      if (enf.rest.size !== 0) {
        right = enf.enforestExpression();
      }
      return new T.ForStatement({
        init: null,
        test: test,
        update: right,
        body: this.enforestStatement()
      });
      // case where init is not null
    } else {
      // testing
      lookahead = enf.peek();
      if (enf.isVarDeclTransform(lookahead) || enf.isLetDeclTransform(lookahead) || enf.isConstDeclTransform(lookahead)) {
        init = enf.enforestVariableDeclaration();
        lookahead = enf.peek();
        if (this.isKeyword(lookahead, 'in') || this.isIdentifier(lookahead, 'of')) {
          if (this.isKeyword(lookahead, 'in')) {
            enf.advance();
            right = enf.enforestExpression();
            cnst = T.ForInStatement;
          } else {
            (0, _errors.assert)(this.isIdentifier(lookahead, 'of'), 'expecting `of` keyword');
            enf.advance();
            right = enf.enforestExpression();
            cnst = T.ForOfStatement;
          }
          return new cnst({
            left: init, right, body: this.enforestStatement()
          });
        }
        enf.matchPunctuator(';');
        if (enf.isPunctuator(enf.peek(), ';')) {
          enf.advance();
          test = null;
        } else {
          test = enf.enforestExpression();
          enf.matchPunctuator(';');
        }
        update = enf.enforestExpression();
      } else {
        if (this.isKeyword(enf.peek(1), 'in') || this.isIdentifier(enf.peek(1), 'of')) {
          left = enf.enforestBindingIdentifier();
          let kind = enf.advance();
          if (this.isKeyword(kind, 'in')) {
            cnst = T.ForInStatement;
          } else {
            cnst = T.ForOfStatement;
          }
          right = enf.enforestExpression();
          return new cnst({
            left: left, right, body: this.enforestStatement()
          });
        }
        init = enf.enforestExpression();
        enf.matchPunctuator(';');
        if (enf.isPunctuator(enf.peek(), ';')) {
          enf.advance();
          test = null;
        } else {
          test = enf.enforestExpression();
          enf.matchPunctuator(';');
        }
        update = enf.enforestExpression();
      }
      return new T.ForStatement({ init, test, update, body: this.enforestStatement() });
    }
  }

  enforestIfStatement() {
    this.matchKeyword('if');
    let cond = this.matchParens();
    let enf = new Enforester(cond, (0, _immutable.List)(), this.context);
    let lookahead = enf.peek();
    let test = enf.enforestExpression();
    if (test === null) {
      throw enf.createError(lookahead, 'expecting an expression');
    }
    let consequent = this.enforestStatement();
    let alternate = null;
    if (this.isKeyword(this.peek(), 'else')) {
      this.advance();
      alternate = this.enforestStatement();
    }
    return new T.IfStatement({ test, consequent, alternate });
  }

  enforestWhileStatement() {
    this.matchKeyword('while');
    let cond = this.matchParens();
    let enf = new Enforester(cond, (0, _immutable.List)(), this.context);
    let lookahead = enf.peek();
    let test = enf.enforestExpression();
    if (test === null) {
      throw enf.createError(lookahead, 'expecting an expression');
    }
    let body = this.enforestStatement();

    return new T.WhileStatement({ test, body });
  }

  enforestBlockStatement() {
    return new T.BlockStatement({
      block: this.enforestBlock()
    });
  }

  enforestBlock() {
    return new T.Block({
      statements: this.matchCurlies()
    });
  }

  enforestClass({ isExpr = false, inDefault = false }) {
    let kw = this.matchRawSyntax();
    let name = null,
        supr = null;

    if (this.isIdentifier(this.peek())) {
      name = this.enforestBindingIdentifier();
    } else if (!isExpr) {
      if (inDefault) {
        name = new T.BindingIdentifier({
          name: _syntax2.default.fromIdentifier('_default', kw)
        });
      } else {
        throw this.createError(this.peek(), 'unexpected syntax');
      }
    }

    if (this.isKeyword(this.peek(), 'extends')) {
      this.advance();
      supr = this.enforestExpressionLoop();
    }

    let elements = [];
    let enf = new Enforester(this.matchCurlies(), (0, _immutable.List)(), this.context);
    while (enf.rest.size !== 0) {
      if (enf.isPunctuator(enf.peek(), ';')) {
        enf.advance();
        continue;
      }

      let isStatic = false;
      let { methodOrKey, kind } = enf.enforestMethodDefinition();
      if (kind === 'identifier' && methodOrKey.value.val() === 'static') {
        isStatic = true;
        ({ methodOrKey, kind } = enf.enforestMethodDefinition());
      }
      if (kind === 'method') {
        elements.push(new T.ClassElement({ isStatic, method: methodOrKey }));
      } else {
        throw this.createError(enf.peek(), 'Only methods are allowed in classes');
      }
    }
    return new (isExpr ? T.ClassExpression : T.ClassDeclaration)({
      name, super: supr,
      elements: (0, _immutable.List)(elements)
    });
  }

  enforestBindingTarget({ allowPunctuator = false } = {}) {
    let lookahead = this.peek();
    if (this.isIdentifier(lookahead) || this.isKeyword(lookahead) || allowPunctuator && this.isPunctuator(lookahead)) {
      return this.enforestBindingIdentifier({ allowPunctuator });
    } else if (this.isBrackets(lookahead)) {
      return this.enforestArrayBinding();
    } else if (this.isBraces(lookahead)) {
      return this.enforestObjectBinding();
    }
    (0, _errors.assert)(false, 'not implemented yet');
  }

  enforestObjectBinding() {
    let enf = new Enforester(this.matchCurlies(), (0, _immutable.List)(), this.context);
    let properties = [];
    while (enf.rest.size !== 0) {
      properties.push(enf.enforestBindingProperty());
      enf.consumeComma();
    }

    return new T.ObjectBinding({
      properties: (0, _immutable.List)(properties)
    });
  }

  enforestBindingProperty() {
    let lookahead = this.peek();
    let { name, binding } = this.enforestPropertyName();
    if (this.isIdentifier(lookahead) || this.isKeyword(lookahead, 'let') || this.isKeyword(lookahead, 'yield')) {
      if (!this.isPunctuator(this.peek(), ':')) {
        let defaultValue = null;
        if (this.isAssign(this.peek())) {
          this.advance();
          let expr = this.enforestExpressionLoop();
          defaultValue = expr;
        }
        return new T.BindingPropertyIdentifier({
          binding, init: defaultValue
        });
      }
    }
    this.matchPunctuator(':');
    binding = this.enforestBindingElement();
    return new T.BindingPropertyProperty({
      name, binding
    });
  }

  enforestArrayBinding() {
    let bracket = this.matchSquares();
    let enf = new Enforester(bracket, (0, _immutable.List)(), this.context);
    let elements = [],
        restElement = null;
    while (enf.rest.size !== 0) {
      let el;
      if (enf.isPunctuator(enf.peek(), ',')) {
        enf.consumeComma();
        el = null;
      } else {
        if (enf.isPunctuator(enf.peek(), '...')) {
          enf.advance();
          restElement = enf.enforestBindingTarget();
          break;
        } else {
          el = enf.enforestBindingElement();
        }
        enf.consumeComma();
      }
      elements.push(el);
    }
    return new T.ArrayBinding({
      elements: (0, _immutable.List)(elements),
      restElement
    });
  }

  enforestBindingElement() {
    let binding = this.enforestBindingTarget();

    if (this.isAssign(this.peek())) {
      this.advance();
      let init = this.enforestExpressionLoop();
      binding = new T.BindingWithDefault({ binding, init });
    }
    return binding;
  }

  enforestBindingIdentifier({ allowPunctuator } = {}) {
    let name;
    if (allowPunctuator && this.isPunctuator(this.peek())) {
      name = this.enforestPunctuator();
    } else {
      name = this.enforestIdentifier();
    }
    return new T.BindingIdentifier({ name });
  }

  enforestPunctuator() {
    let lookahead = this.peek();
    if (this.isPunctuator(lookahead)) {
      return this.matchRawSyntax();
    }
    throw this.createError(lookahead, 'expecting a punctuator');
  }

  enforestIdentifier() {
    let lookahead = this.peek();
    if (this.isIdentifier(lookahead) || this.isKeyword(lookahead)) {
      return this.matchRawSyntax();
    }
    throw this.createError(lookahead, 'expecting an identifier');
  }

  enforestReturnStatement() {
    let kw = this.matchRawSyntax();
    let lookahead = this.peek();

    // short circuit for the empty expression case
    if (this.rest.size === 0 || lookahead && !this.lineNumberEq(kw, lookahead)) {
      return new T.ReturnStatement({
        expression: null
      });
    }

    let term = null;
    if (!this.isPunctuator(lookahead, ';')) {
      term = this.enforestExpression();
      (0, _errors.expect)(term != null, 'Expecting an expression to follow return keyword', lookahead, this.rest);
    }

    this.consumeSemicolon();
    return new T.ReturnStatement({
      expression: term
    });
  }

  enforestVariableDeclaration() {
    let kind;
    let lookahead = this.matchRawSyntax();
    let kindSyn = lookahead;
    let phase = this.context.phase;

    if (kindSyn && this.context.env.get(kindSyn.resolve(phase)) === _transforms.VariableDeclTransform) {
      kind = 'var';
    } else if (kindSyn && this.context.env.get(kindSyn.resolve(phase)) === _transforms.LetDeclTransform) {
      kind = 'let';
    } else if (kindSyn && this.context.env.get(kindSyn.resolve(phase)) === _transforms.ConstDeclTransform) {
      kind = 'const';
    } else if (kindSyn && this.context.env.get(kindSyn.resolve(phase)) === _transforms.SyntaxDeclTransform) {
      kind = 'syntax';
    } else if (kindSyn && this.context.env.get(kindSyn.resolve(phase)) === _transforms.SyntaxrecDeclTransform) {
      kind = 'syntaxrec';
    }

    let decls = (0, _immutable.List)();

    while (true) {
      let term = this.enforestVariableDeclarator({ isSyntax: kind === 'syntax' || kind === 'syntaxrec' });
      let lookahead = this.peek();
      decls = decls.concat(term);

      if (this.isPunctuator(lookahead, ',')) {
        this.advance();
      } else {
        break;
      }
    }

    return new T.VariableDeclaration({
      kind: kind,
      declarators: decls
    });
  }

  enforestVariableDeclarator({ isSyntax }) {
    let id = this.enforestBindingTarget({ allowPunctuator: isSyntax });
    let lookahead = this.peek();

    let init;
    if (this.isPunctuator(lookahead, '=')) {
      this.advance();
      let enf = new Enforester(this.rest, (0, _immutable.List)(), this.context);
      init = enf.enforest('expression');
      this.rest = enf.rest;
    } else {
      init = null;
    }
    return new T.VariableDeclarator({
      binding: id,
      init: init
    });
  }

  enforestExpressionStatement() {
    let start = this.rest.get(0);
    let expr = this.enforestExpression();
    if (expr === null) {
      throw this.createError(start, 'not a valid expression');
    }
    this.consumeSemicolon();

    return new T.ExpressionStatement({
      expression: expr
    });
  }

  enforestExpression() {
    let left = this.enforestExpressionLoop();
    let lookahead = this.peek();
    if (this.isPunctuator(lookahead, ',')) {
      while (this.rest.size !== 0) {
        if (!this.isPunctuator(this.peek(), ',')) {
          break;
        }
        let operator = this.matchRawSyntax();
        let right = this.enforestExpressionLoop();
        left = new T.BinaryExpression({ left, operator: operator.val(), right });
      }
    }
    this.term = null;
    return left;
  }

  enforestExpressionLoop() {
    this.term = null;
    this.opCtx = {
      prec: 0,
      combine: x => x,
      stack: (0, _immutable.List)()
    };

    do {
      let term = this.enforestAssignmentExpression();
      // no change means we've done as much enforesting as possible
      // if nothing changed, maybe we just need to pop the expr stack
      if (term === EXPR_LOOP_NO_CHANGE && this.opCtx.stack.size > 0) {
        this.term = this.opCtx.combine(this.term);
        let { prec, combine } = this.opCtx.stack.last();
        this.opCtx.prec = prec;
        this.opCtx.combine = combine;
        this.opCtx.stack = this.opCtx.stack.pop();
      } else if (term === EXPR_LOOP_NO_CHANGE) {
        break;
      } else if (term === EXPR_LOOP_OPERATOR || term === EXPR_LOOP_EXPANSION) {
        // operator means an opCtx was pushed on the stack
        this.term = null;
      } else {
        this.term = term;
      }
    } while (true); // get a fixpoint
    return this.term;
  }

  enforestAssignmentExpression() {
    let lookahead = this.peek();

    if (this.term === null && this.isModuleNamespaceTransform(lookahead)) {
      // $FlowFixMe: we need to refactor the enforester to make flow work better
      let namespace = this.getFromCompiletimeEnvironment(this.advance().value);
      this.matchPunctuator('.');
      let name = this.matchIdentifier();
      // $FlowFixMe: we need to refactor the enforester to make flow work better
      let exportedName = namespace.mod.exportedNames.find(exName => exName.exportedName.val() === name.val());
      this.rest = this.rest.unshift(new T.RawSyntax({
        value: _syntax2.default.fromIdentifier(name.val(), exportedName.exportedName)
      }));
      lookahead = this.peek();
    }

    if (this.term === null && this.isCompiletimeTransform(lookahead)) {
      this.expandMacro();
      lookahead = this.peek();
    }

    if (this.term === null && this.isTerm(lookahead) && lookahead instanceof T.Expression) {
      // TODO: check that this is actually an expression
      return this.advance();
    }

    if (this.term === null && this.isKeyword(lookahead, 'yield')) {
      return this.enforestYieldExpression();
    }

    if (this.term === null && this.isKeyword(lookahead, 'class')) {
      return this.enforestClass({ isExpr: true });
    }

    if (this.term === null && lookahead && (this.isIdentifier(lookahead) || this.isParens(lookahead)) && this.isPunctuator(this.peek(1), '=>') && this.lineNumberEq(lookahead, this.peek(1))) {
      return this.enforestArrowExpression();
    }

    if (this.term === null && this.isSyntaxTemplate(lookahead)) {
      return this.enforestSyntaxTemplate();
    }

    // ($x:expr)
    if (this.term === null && this.isParens(lookahead)) {
      return new T.ParenthesizedExpression({
        inner: this.matchParens()
      });
    }

    if (this.term === null && (this.isKeyword(lookahead, 'this') || this.isIdentifier(lookahead) || this.isKeyword(lookahead, 'let') || this.isKeyword(lookahead, 'yield') || this.isNumericLiteral(lookahead) || this.isStringLiteral(lookahead) || this.isTemplate(lookahead) || this.isBooleanLiteral(lookahead) || this.isNullLiteral(lookahead) || this.isRegularExpression(lookahead) || this.isFnDeclTransform(lookahead) || this.isBraces(lookahead) || this.isBrackets(lookahead))) {
      return this.enforestPrimaryExpression();
    }

    // prefix unary
    if (this.term === null && this.isOperator(lookahead)) {
      return this.enforestUnaryExpression();
    }

    if (this.term === null && this.isVarBindingTransform(lookahead) && lookahead instanceof T.RawSyntax) {
      let lookstx = lookahead.value;
      // $FlowFixMe
      let id = this.getFromCompiletimeEnvironment(lookstx).id;
      if (id !== lookstx) {
        this.advance();
        this.rest = _immutable.List.of(id).concat(this.rest);
        return EXPR_LOOP_EXPANSION;
      }
    }

    if (this.term === null && (this.isNewTransform(lookahead) || this.isKeyword(lookahead, 'super')) ||
    // and then check the cases where the term part of p is something...
    this.term && (
    // $x:expr . $prop:ident
    this.isPunctuator(lookahead, '.') && (this.isIdentifier(this.peek(1)) || this.isKeyword(this.peek(1))) ||
    // $x:expr [ $b:expr ]
    this.isBrackets(lookahead) ||
    // $x:expr (...)
    this.isParens(lookahead))) {
      return this.enforestLeftHandSideExpression({ allowCall: true });
    }

    // $x:id `...`
    if (this.term && this.isTemplate(lookahead)) {
      return this.enforestTemplateLiteral();
    }

    // postfix unary
    if (this.term && this.isUpdateOperator(lookahead)) {
      return this.enforestUpdateExpression();
    }

    // $l:expr $op:binaryOperator $r:expr
    if (this.term && this.isOperator(lookahead)) {
      return this.enforestBinaryExpression();
    }

    // $x:expr = $init:expr
    if (this.term && this.isAssign(lookahead)) {
      let binding = this.transformDestructuring(this.term);
      let op = this.matchRawSyntax();

      let enf = new Enforester(this.rest, (0, _immutable.List)(), this.context);
      let init = enf.enforest('expression');
      this.rest = enf.rest;

      if (op.val() === '=') {
        return new T.AssignmentExpression({
          binding,
          expression: init
        });
      } else {
        return new T.CompoundAssignmentExpression({
          binding,
          operator: op.val(),
          expression: init
        });
      }
    }

    if (this.term && this.isPunctuator(lookahead, '?')) {
      return this.enforestConditionalExpression();
    }

    return EXPR_LOOP_NO_CHANGE;
  }

  enforestPrimaryExpression() {
    let lookahead = this.peek();
    // $x:ThisExpression
    if (this.term === null && this.isKeyword(lookahead, 'this')) {
      return this.enforestThisExpression();
    }
    // $x:ident
    if (this.term === null && (this.isIdentifier(lookahead) || this.isKeyword(lookahead, 'let') || this.isKeyword(lookahead, 'yield'))) {
      return this.enforestIdentifierExpression();
    }
    if (this.term === null && this.isNumericLiteral(lookahead)) {
      return this.enforestNumericLiteral();
    }
    if (this.term === null && this.isStringLiteral(lookahead)) {
      return this.enforestStringLiteral();
    }
    if (this.term === null && this.isTemplate(lookahead)) {
      return this.enforestTemplateLiteral();
    }
    if (this.term === null && this.isBooleanLiteral(lookahead)) {
      return this.enforestBooleanLiteral();
    }
    if (this.term === null && this.isNullLiteral(lookahead)) {
      return this.enforestNullLiteral();
    }
    if (this.term === null && this.isRegularExpression(lookahead)) {
      return this.enforestRegularExpressionLiteral();
    }
    // $x:FunctionExpression
    if (this.term === null && this.isFnDeclTransform(lookahead)) {
      return this.enforestFunction({ isExpr: true });
    }
    // { $p:prop (,) ... }
    if (this.term === null && this.isBraces(lookahead)) {
      return this.enforestObjectExpression();
    }
    // [$x:expr (,) ...]
    if (this.term === null && this.isBrackets(lookahead)) {
      return this.enforestArrayExpression();
    }
    (0, _errors.assert)(false, 'Not a primary expression');
  }

  enforestLeftHandSideExpression({ allowCall }) {
    let lookahead = this.peek();

    if (this.isKeyword(lookahead, 'super')) {
      this.advance();
      this.term = new T.Super({});
    } else if (this.isNewTransform(lookahead)) {
      this.term = this.enforestNewExpression();
    } else if (this.isKeyword(lookahead, 'this')) {
      this.term = this.enforestThisExpression();
    }

    while (true) {
      lookahead = this.peek();
      if (this.isParens(lookahead)) {
        if (!allowCall) {
          // we're dealing with a new expression
          if (this.term && ((0, _terms.isIdentifierExpression)(this.term) || (0, _terms.isStaticMemberExpression)(this.term) || (0, _terms.isComputedMemberExpression)(this.term))) {
            return this.term;
          }
          this.term = this.enforestExpressionLoop();
        } else {
          this.term = this.enforestCallExpression();
        }
      } else if (this.isBrackets(lookahead)) {
        this.term = this.term ? this.enforestComputedMemberExpression() : this.enforestPrimaryExpression();
      } else if (this.isPunctuator(lookahead, '.') && (this.isIdentifier(this.peek(1)) || this.isKeyword(this.peek(1)))) {
        this.term = this.enforestStaticMemberExpression();
      } else if (this.isTemplate(lookahead)) {
        this.term = this.enforestTemplateLiteral();
      } else if (this.isBraces(lookahead)) {
        this.term = this.enforestPrimaryExpression();
      } else if (this.isIdentifier(lookahead)) {
        this.term = new T.IdentifierExpression({ name: this.enforestIdentifier() });
      } else {
        break;
      }
    }
    return this.term;
  }

  enforestBooleanLiteral() {
    return new T.LiteralBooleanExpression({
      value: this.matchRawSyntax().val() === 'true'
    });
  }

  enforestTemplateLiteral() {
    return new T.TemplateExpression({
      tag: this.term,
      elements: this.enforestTemplateElements()
    });
  }

  enforestStringLiteral() {
    return new T.LiteralStringExpression({
      value: this.matchRawSyntax().val()
    });
  }

  enforestNumericLiteral() {
    let num = this.matchRawSyntax();
    if (num.val() === 1 / 0) {
      return new T.LiteralInfinityExpression({});
    }
    return new T.LiteralNumericExpression({
      value: num.val()
    });
  }

  enforestIdentifierExpression() {
    return new T.IdentifierExpression({
      name: this.matchRawSyntax()
    });
  }

  enforestRegularExpressionLiteral() {
    let reStx = this.matchRawSyntax();

    let lastSlash = reStx.token.value.lastIndexOf('/');
    let pattern = reStx.token.value.slice(1, lastSlash);
    let flags = reStx.token.value.slice(lastSlash + 1);
    return new T.LiteralRegExpExpression({
      pattern, flags
    });
  }

  enforestNullLiteral() {
    this.advance();
    return new T.LiteralNullExpression({});
  }

  enforestThisExpression() {
    return new T.ThisExpression({
      stx: this.matchRawSyntax()
    });
  }

  enforestArgumentList() {
    let result = [];
    while (this.rest.size > 0) {
      let arg;
      if (this.isPunctuator(this.peek(), '...')) {
        this.advance();
        arg = new T.SpreadElement({
          expression: this.enforestExpressionLoop()
        });
      } else {
        arg = this.enforestExpressionLoop();
      }
      if (this.rest.size > 0) {
        this.matchPunctuator(',');
      }
      result.push(arg);
    }
    return (0, _immutable.List)(result);
  }

  enforestNewExpression() {
    this.matchKeyword('new');
    if (this.isPunctuator(this.peek(), '.') && this.isIdentifier(this.peek(1), 'target')) {
      this.advance();
      this.advance();
      return new T.NewTargetExpression({});
    }

    let callee = this.enforestLeftHandSideExpression({ allowCall: false });
    let args;
    if (this.isParens(this.peek())) {
      args = this.matchParens();
    } else {
      args = (0, _immutable.List)();
    }
    return new T.NewExpression({
      callee,
      arguments: args
    });
  }

  enforestComputedMemberExpression() {
    let enf = new Enforester(this.matchSquares(), (0, _immutable.List)(), this.context);
    return new T.ComputedMemberExpression({
      object: this.term,
      expression: enf.enforestExpression()
    });
  }

  transformDestructuring(term) {
    switch (term.type) {
      case 'IdentifierExpression':
        return new T.BindingIdentifier({ name: term.name });

      case 'ParenthesizedExpression':
        if (term.inner.size === 1 && this.isIdentifier(term.inner.get(0))) {
          return new T.BindingIdentifier({ name: term.inner.get(0).value });
        }
        return term;
      case 'DataProperty':
        return new T.BindingPropertyProperty({
          name: term.name,
          binding: this.transformDestructuringWithDefault(term.expression)
        });
      case 'ShorthandProperty':
        return new T.BindingPropertyIdentifier({
          binding: new T.BindingIdentifier({ name: term.name }),
          init: null
        });
      case 'ObjectExpression':
        return new T.ObjectBinding({
          properties: term.properties.map(t => this.transformDestructuring(t))
        });
      case 'ArrayExpression':
        {
          let last = term.elements.last();
          if (last != null && last.type === 'SpreadElement') {
            return new T.ArrayBinding({
              elements: term.elements.slice(0, -1).map(t => t && this.transformDestructuringWithDefault(t)),
              restElement: this.transformDestructuringWithDefault(last.expression)
            });
          } else {
            return new T.ArrayBinding({
              elements: term.elements.map(t => t && this.transformDestructuringWithDefault(t)),
              restElement: null
            });
          }
        }
      case 'StaticPropertyName':
        return new T.BindingIdentifier({
          name: term.value
        });
      case 'ComputedMemberExpression':
      case 'StaticMemberExpression':
      case 'ArrayBinding':
      case 'BindingIdentifier':
      case 'BindingPropertyIdentifier':
      case 'BindingPropertyProperty':
      case 'BindingWithDefault':
      case 'ObjectBinding':
        return term;
    }
    (0, _errors.assert)(false, 'not implemented yet for ' + term.type);
  }

  transformDestructuringWithDefault(term) {
    switch (term.type) {
      case 'AssignmentExpression':
        return new T.BindingWithDefault({
          binding: this.transformDestructuring(term.binding),
          init: term.expression
        });
    }
    return this.transformDestructuring(term);
  }

  enforestCallExpression() {
    let paren = this.matchParens();
    return new T.CallExpressionE({
      callee: this.term,
      arguments: paren
    });
  }

  enforestArrowExpression() {
    let enf;
    if (this.isIdentifier(this.peek())) {
      enf = new Enforester(_immutable.List.of(this.advance()), (0, _immutable.List)(), this.context);
    } else {
      let p = this.matchParens();
      enf = new Enforester(p, (0, _immutable.List)(), this.context);
    }
    let params = enf.enforestFormalParameters();
    this.matchPunctuator('=>');

    let body;
    if (this.isBraces(this.peek())) {
      body = this.matchCurlies();
      return new T.ArrowExpressionE({ params, body });
    } else {
      enf = new Enforester(this.rest, (0, _immutable.List)(), this.context);
      body = enf.enforestExpressionLoop();
      this.rest = enf.rest;
      return new T.ArrowExpression({ params, body });
    }
  }

  enforestYieldExpression() {
    let kwd = this.matchKeyword('yield');
    let lookahead = this.peek();

    if (this.rest.size === 0 || lookahead && !this.lineNumberEq(kwd, lookahead)) {
      return new T.YieldExpression({
        expression: null
      });
    } else {
      let isGenerator = false;
      if (this.isPunctuator(this.peek(), '*')) {
        isGenerator = true;
        this.advance();
      }
      let expr = this.enforestExpression();
      return new (isGenerator ? T.YieldGeneratorExpression : T.YieldExpression)({
        expression: expr
      });
    }
  }

  enforestSyntaxTemplate() {
    return new T.SyntaxTemplate({
      template: this.matchRawDelimiter()
    });
  }

  enforestStaticMemberExpression() {
    let object = this.term;
    this.advance();
    let property = this.matchRawSyntax();

    return new T.StaticMemberExpression({
      object: object,
      property: property
    });
  }

  enforestArrayExpression() {
    let arr = this.matchSquares();

    let elements = [];

    let enf = new Enforester(arr, (0, _immutable.List)(), this.context);

    while (enf.rest.size > 0) {
      let lookahead = enf.peek();
      if (enf.isPunctuator(lookahead, ',')) {
        enf.advance();
        elements.push(null);
      } else if (enf.isPunctuator(lookahead, '...')) {
        enf.advance();
        let expression = enf.enforestExpressionLoop();
        if (expression == null) {
          throw enf.createError(lookahead, 'expecting expression');
        }
        elements.push(new T.SpreadElement({ expression }));
      } else {
        let term = enf.enforestExpressionLoop();
        if (term == null) {
          throw enf.createError(lookahead, 'expected expression');
        }
        elements.push(term);
        enf.consumeComma();
      }
    }

    return new T.ArrayExpression({
      elements: (0, _immutable.List)(elements)
    });
  }

  enforestObjectExpression() {
    let obj = this.matchCurlies();

    let properties = (0, _immutable.List)();

    let enf = new Enforester(obj, (0, _immutable.List)(), this.context);

    let lastProp = null;
    while (enf.rest.size > 0) {
      let prop = enf.enforestPropertyDefinition();
      enf.consumeComma();
      properties = properties.concat(prop);

      if (lastProp === prop) {
        throw enf.createError(prop, 'invalid syntax in object');
      }
      lastProp = prop;
    }

    return new T.ObjectExpression({
      properties: properties
    });
  }

  enforestPropertyDefinition() {

    let { methodOrKey, kind } = this.enforestMethodDefinition();

    switch (kind) {
      case 'method':
        return methodOrKey;
      case 'identifier':
        if (this.isAssign(this.peek())) {
          this.advance();
          let init = this.enforestExpressionLoop();
          return new T.BindingPropertyIdentifier({
            init, binding: this.transformDestructuring(methodOrKey)
          });
        } else if (!this.isPunctuator(this.peek(), ':')) {
          return new T.ShorthandProperty({
            name: methodOrKey.value
          });
        }
    }

    this.matchPunctuator(':');
    let expr = this.enforestExpressionLoop();

    return new T.DataProperty({
      name: methodOrKey,
      expression: expr
    });
  }

  enforestMethodDefinition() {
    let lookahead = this.peek();
    let isGenerator = false;
    if (this.isPunctuator(lookahead, '*')) {
      isGenerator = true;
      this.advance();
    }

    if (this.isIdentifier(lookahead, 'get') && this.isPropertyName(this.peek(1))) {
      this.advance();
      let { name } = this.enforestPropertyName();
      this.matchParens();
      let body = this.matchCurlies();
      return {
        methodOrKey: new T.Getter({ name, body }),
        kind: 'method'
      };
    } else if (this.isIdentifier(lookahead, 'set') && this.isPropertyName(this.peek(1))) {
      this.advance();
      let { name } = this.enforestPropertyName();
      let enf = new Enforester(this.matchParens(), (0, _immutable.List)(), this.context);
      let param = enf.enforestBindingElement();
      let body = this.matchCurlies();
      return {
        methodOrKey: new T.Setter({ name, param, body }),
        kind: 'method'
      };
    }
    let { name } = this.enforestPropertyName();
    if (this.isParens(this.peek())) {
      let params = this.matchParens();
      let enf = new Enforester(params, (0, _immutable.List)(), this.context);
      let formalParams = enf.enforestFormalParameters();

      let body = this.matchCurlies();
      return {
        methodOrKey: new T.Method({
          isGenerator,
          name, params: formalParams, body
        }),
        kind: 'method'
      };
    }
    return {
      methodOrKey: name,
      kind: this.isIdentifier(lookahead) || this.isKeyword(lookahead) ? 'identifier' : 'property'
    };
  }

  enforestPropertyName() {
    let lookahead = this.peek();

    if (this.isStringLiteral(lookahead) || this.isNumericLiteral(lookahead)) {
      return {
        name: new T.StaticPropertyName({
          value: this.matchRawSyntax()
        }),
        binding: null
      };
    } else if (this.isBrackets(lookahead)) {
      let enf = new Enforester(this.matchSquares(), (0, _immutable.List)(), this.context);
      let expr = enf.enforestExpressionLoop();
      return {
        name: new T.ComputedPropertyName({
          expression: expr
        }),
        binding: null
      };
    }
    let name = this.matchRawSyntax();
    return {
      name: new T.StaticPropertyName({ value: name }),
      binding: new T.BindingIdentifier({ name })
    };
  }

  enforestFunction({ isExpr, inDefault }) {
    let name = null,
        params,
        body;
    let isGenerator = false;
    // eat the function keyword
    let fnKeyword = this.matchRawSyntax();
    let lookahead = this.peek();

    if (this.isPunctuator(lookahead, '*')) {
      isGenerator = true;
      this.advance();
      lookahead = this.peek();
    }

    if (!this.isParens(lookahead)) {
      name = this.enforestBindingIdentifier();
    } else if (inDefault) {
      name = new T.BindingIdentifier({
        name: _syntax2.default.fromIdentifier('*default*', fnKeyword)
      });
    }

    params = this.matchParens();

    body = this.matchCurlies();

    let enf = new Enforester(params, (0, _immutable.List)(), this.context);
    let formalParams = enf.enforestFormalParameters();

    return new (isExpr ? T.FunctionExpressionE : T.FunctionDeclarationE)({
      name: name,
      isGenerator: isGenerator,
      params: formalParams,
      body: body
    });
  }

  enforestFormalParameters() {
    let items = [];
    let rest = null;
    while (this.rest.size !== 0) {
      let lookahead = this.peek();
      if (this.isPunctuator(lookahead, '...')) {
        this.matchPunctuator('...');
        rest = this.enforestBindingIdentifier();
        break;
      }
      items.push(this.enforestParam());
      this.consumeComma();
    }
    return new T.FormalParameters({
      items: (0, _immutable.List)(items), rest
    });
  }

  enforestParam() {
    return this.enforestBindingElement();
  }

  enforestUpdateExpression() {
    let operator = this.matchUnaryOperator();

    return new T.UpdateExpression({
      isPrefix: false,
      operator: operator.val(),
      operand: this.transformDestructuring(this.term)
    });
  }

  enforestUnaryExpression() {
    let operator = this.matchUnaryOperator();
    this.opCtx.stack = this.opCtx.stack.push({
      prec: this.opCtx.prec,
      combine: this.opCtx.combine
    });
    // TODO: all builtins are 14, custom operators will change this
    this.opCtx.prec = 14;
    this.opCtx.combine = rightTerm => {
      if (operator.val() === '++' || operator.val() === '--') {
        return new T.UpdateExpression({
          operator: operator.val(),
          operand: this.transformDestructuring(rightTerm),
          isPrefix: true
        });
      } else {
        return new T.UnaryExpression({
          operator: operator.val(),
          operand: rightTerm
        });
      }
    };
    return EXPR_LOOP_OPERATOR;
  }

  enforestConditionalExpression() {
    // first, pop the operator stack
    let test = this.opCtx.combine(this.term);
    if (this.opCtx.stack.size > 0) {
      let { prec, combine } = this.opCtx.stack.last();
      this.opCtx.stack = this.opCtx.stack.pop();
      this.opCtx.prec = prec;
      this.opCtx.combine = combine;
    }

    this.matchPunctuator('?');
    let enf = new Enforester(this.rest, (0, _immutable.List)(), this.context);
    let consequent = enf.enforestExpressionLoop();
    enf.matchPunctuator(':');
    enf = new Enforester(enf.rest, (0, _immutable.List)(), this.context);
    let alternate = enf.enforestExpressionLoop();
    this.rest = enf.rest;
    return new T.ConditionalExpression({
      test, consequent, alternate
    });
  }

  enforestBinaryExpression() {

    let leftTerm = this.term;
    let opStx = this.peek();

    if (opStx instanceof T.RawSyntax && (0, _operators.operatorLt)(this.opCtx.prec, (0, _operators.getOperatorPrec)(opStx.value.val()), (0, _operators.getOperatorAssoc)(opStx.value.val()))) {
      let op = opStx.value;
      this.opCtx.stack = this.opCtx.stack.push({
        prec: this.opCtx.prec,
        combine: this.opCtx.combine
      });
      this.opCtx.prec = (0, _operators.getOperatorPrec)(op.val());
      this.opCtx.combine = rightTerm => {
        return new T.BinaryExpression({
          left: leftTerm,
          operator: op.val(),
          right: rightTerm
        });
      };
      this.advance();
      return EXPR_LOOP_OPERATOR;
    } else {
      let term = this.opCtx.combine(leftTerm);
      // this.rest does not change
      let { prec, combine } = this.opCtx.stack.last();
      this.opCtx.stack = this.opCtx.stack.pop();
      this.opCtx.prec = prec;
      this.opCtx.combine = combine;
      return term;
    }
  }

  enforestTemplateElements() {
    let lookahead = this.matchTemplate();
    let elements = lookahead.token.items.map(it => {
      if (this.isDelimiter(it)) {
        let enf = new Enforester(it.inner.slice(1, it.inner.size - 1), (0, _immutable.List)(), this.context);
        return enf.enforest('expression');
      }
      return new T.TemplateElement({
        rawValue: it.value.token.slice.text
      });
    });
    return elements;
  }

  expandMacro() {
    let lookahead = this.peek();
    while (this.isCompiletimeTransform(lookahead)) {
      let name = this.matchRawSyntax();

      let syntaxTransform = this.getFromCompiletimeEnvironment(name);
      if (syntaxTransform == null) {
        throw this.createError(name, `The macro ${ name.resolve(this.context.phase) } does not have a bound value`);
      } else if (typeof syntaxTransform.value !== 'function') {
        throw this.createError(name, `The macro ${ name.resolve(this.context.phase) } was not bound to a callable value: ${ syntaxTransform.value }`);
      }
      let useSiteScope = (0, _scope.freshScope)('u');
      let introducedScope = (0, _scope.freshScope)('i');
      // TODO: needs to be a list of scopes I think
      this.context.useScope = useSiteScope;

      let ctx = new _macroContext2.default(this, name, this.context, useSiteScope, introducedScope);

      let result = (0, _loadSyntax.sanitizeReplacementValues)(syntaxTransform.value.call(null, ctx));
      if (!_immutable.List.isList(result)) {
        throw this.createError(name, 'macro must return a list but got: ' + result);
      }
      let scopeReducer = new _scopeReducer2.default([{ scope: introducedScope, phase: _syntax.ALL_PHASES, flip: true }], this.context.bindings, true);
      result = result.map(terms => {
        if (terms instanceof _syntax2.default) {
          return new T.RawSyntax({
            value: terms
          }).reduce(scopeReducer);
        } else if (!(terms instanceof T.default)) {
          throw this.createError(name, 'macro must return syntax objects or terms but got: ' + terms);
        }
        return terms.reduce(scopeReducer);
      });

      this.rest = result.concat(ctx._rest(this));
      lookahead = this.peek();
    }
  }

  consumeSemicolon() {
    let lookahead = this.peek();

    if (lookahead && this.isPunctuator(lookahead, ';')) {
      this.advance();
    }
  }

  consumeComma() {
    let lookahead = this.peek();

    if (lookahead && this.isPunctuator(lookahead, ',')) {
      this.advance();
    }
  }

  safeCheck(obj, type, val = null) {
    if (obj instanceof T.default) {
      if (obj instanceof T.RawSyntax) {
        return obj.value && (typeof obj.value.match === 'function' ? obj.value.match(type, val) : false);
      } else if (obj instanceof T.RawDelimiter) {
        return type === 'delimiter' || obj.kind === type;
      }
    }
    return obj && (typeof obj.match === 'function' ? obj.match(type, val) : false);
  }

  isTerm(term) {
    return term && term instanceof T.default;
  }

  isEOF(obj) {
    return this.safeCheck(obj, 'eof');
  }

  isIdentifier(obj, val = null) {
    return this.safeCheck(obj, 'identifier', val);
  }

  isPropertyName(obj) {
    return this.isIdentifier(obj) || this.isKeyword(obj) || this.isNumericLiteral(obj) || this.isStringLiteral(obj) || this.isBrackets(obj);
  }

  isNumericLiteral(obj, val = null) {
    return this.safeCheck(obj, 'number', val);
  }

  isStringLiteral(obj, val = null) {
    return this.safeCheck(obj, 'string', val);
  }

  isTemplate(obj, val = null) {
    return this.safeCheck(obj, 'template', val);
  }

  isSyntaxTemplate(obj) {
    return this.safeCheck(obj, 'syntaxTemplate');
  }

  isBooleanLiteral(obj, val = null) {
    return this.safeCheck(obj, 'boolean', val);
  }

  isNullLiteral(obj, val = null) {
    return this.safeCheck(obj, 'null', val);
  }

  isRegularExpression(obj, val = null) {
    return this.safeCheck(obj, 'regularExpression', val);
  }

  isDelimiter(obj) {
    return this.safeCheck(obj, 'delimiter');
  }

  isParens(obj) {
    return this.safeCheck(obj, 'parens');
  }

  isBraces(obj) {
    return this.safeCheck(obj, 'braces');
  }

  isBrackets(obj) {
    return this.safeCheck(obj, 'brackets');
  }

  isAssign(obj, val = null) {
    return this.safeCheck(obj, 'assign', val);
  }

  isKeyword(obj, val = null) {
    return this.safeCheck(obj, 'keyword', val);
  }

  isPunctuator(obj, val = null) {
    return this.safeCheck(obj, 'punctuator', val);
  }

  isOperator(obj) {
    return (this.safeCheck(obj, 'punctuator') || this.safeCheck(obj, 'identifier') || this.safeCheck(obj, 'keyword')) && (obj instanceof T.RawSyntax && (0, _operators.isOperator)(obj.value) || obj instanceof _syntax2.default && (0, _operators.isOperator)(obj));
  }

  isUpdateOperator(obj) {
    return this.safeCheck(obj, 'punctuator', '++') || this.safeCheck(obj, 'punctuator', '--');
  }

  safeResolve(obj, phase) {
    if (obj instanceof T.RawSyntax) {
      return typeof obj.value.resolve === 'function' ? Just(obj.value.resolve(phase)) : Nothing();
    } else if (obj instanceof _syntax2.default) {
      return typeof obj.resolve === 'function' ? Just(obj.resolve(phase)) : Nothing();
    }
    return Nothing();
  }

  isTransform(obj, trans) {
    return this.safeResolve(obj, this.context.phase).map(name => this.context.env.get(name) === trans || this.context.store.get(name) === trans).getOrElse(false);
  }

  isTransformInstance(obj, trans) {
    return this.safeResolve(obj, this.context.phase).map(name => this.context.env.get(name) instanceof trans || this.context.store.get(name) instanceof trans).getOrElse(false);
  }

  isFnDeclTransform(obj) {
    return this.isTransform(obj, _transforms.FunctionDeclTransform);
  }

  isVarDeclTransform(obj) {
    return this.isTransform(obj, _transforms.VariableDeclTransform);
  }

  isLetDeclTransform(obj) {
    return this.isTransform(obj, _transforms.LetDeclTransform);
  }

  isConstDeclTransform(obj) {
    return this.isTransform(obj, _transforms.ConstDeclTransform);
  }

  isSyntaxDeclTransform(obj) {
    return this.isTransform(obj, _transforms.SyntaxDeclTransform);
  }

  isSyntaxrecDeclTransform(obj) {
    return this.isTransform(obj, _transforms.SyntaxrecDeclTransform);
  }

  isReturnStmtTransform(obj) {
    return this.isTransform(obj, _transforms.ReturnStatementTransform);
  }

  isWhileTransform(obj) {
    return this.isTransform(obj, _transforms.WhileTransform);
  }

  isForTransform(obj) {
    return this.isTransform(obj, _transforms.ForTransform);
  }

  isSwitchTransform(obj) {
    return this.isTransform(obj, _transforms.SwitchTransform);
  }

  isBreakTransform(obj) {
    return this.isTransform(obj, _transforms.BreakTransform);
  }

  isContinueTransform(obj) {
    return this.isTransform(obj, _transforms.ContinueTransform);
  }

  isDoTransform(obj) {
    return this.isTransform(obj, _transforms.DoTransform);
  }

  isDebuggerTransform(obj) {
    return this.isTransform(obj, _transforms.DebuggerTransform);
  }

  isWithTransform(obj) {
    return this.isTransform(obj, _transforms.WithTransform);
  }

  isTryTransform(obj) {
    return this.isTransform(obj, _transforms.TryTransform);
  }

  isThrowTransform(obj) {
    return this.isTransform(obj, _transforms.ThrowTransform);
  }

  isIfTransform(obj) {
    return this.isTransform(obj, _transforms.IfTransform);
  }

  isNewTransform(obj) {
    return this.isTransform(obj, _transforms.NewTransform);
  }

  isCompiletimeTransform(obj) {
    return this.isTransformInstance(obj, _transforms.CompiletimeTransform);
  }

  isModuleNamespaceTransform(obj) {
    return this.isTransformInstance(obj, _transforms.ModuleNamespaceTransform);
  }

  isVarBindingTransform(obj) {
    return this.isTransformInstance(obj, _transforms.VarBindingTransform);
  }

  getFromCompiletimeEnvironment(term) {
    if (this.context.env.has(term.resolve(this.context.phase))) {
      return this.context.env.get(term.resolve(this.context.phase));
    }
    return this.context.store.get(term.resolve(this.context.phase));
  }

  lineNumberEq(a, b) {
    if (!(a && b)) {
      return false;
    }
    return getLineNumber(a) === getLineNumber(b);
  }

  matchRawDelimiter() {
    let lookahead = this.advance();
    if (lookahead instanceof T.RawDelimiter) {
      return lookahead.inner;
    }
    throw this.createError(lookahead, 'expecting a RawDelimiter');
  }

  matchRawSyntax() {
    let lookahead = this.advance();
    if (lookahead instanceof T.RawSyntax) {
      return lookahead.value;
    }
    throw this.createError(lookahead, 'expecting a RawSyntax');
  }

  matchIdentifier(val) {
    let lookahead = this.peek();
    if (this.isIdentifier(lookahead, val)) {
      return this.matchRawSyntax();
    }
    throw this.createError(lookahead, 'expecting an identifier');
  }

  matchKeyword(val) {
    let lookahead = this.peek();
    if (this.isKeyword(lookahead, val)) {
      return this.matchRawSyntax();
    }
    throw this.createError(lookahead, 'expecting ' + val);
  }

  matchLiteral() {
    let lookahead = this.peek();
    if (this.isNumericLiteral(lookahead) || this.isStringLiteral(lookahead) || this.isBooleanLiteral(lookahead) || this.isNullLiteral(lookahead) || this.isTemplate(lookahead) || this.isRegularExpression(lookahead)) {
      return this.matchRawSyntax();
    }
    throw this.createError(lookahead, 'expecting a literal');
  }

  matchStringLiteral() {
    let lookahead = this.peek();
    if (this.isStringLiteral(lookahead)) {
      return this.matchRawSyntax();
    }
    throw this.createError(lookahead, 'expecting a string literal');
  }

  matchTemplate() {
    let lookahead = this.peek();
    if (this.isTemplate(lookahead)) {
      return this.matchRawSyntax();
    }
    throw this.createError(lookahead, 'expecting a template literal');
  }

  matchParens() {
    let lookahead = this.peek();
    if (this.isParens(lookahead)) {
      let inner = this.matchRawDelimiter();
      return inner.slice(1, inner.size - 1);
    }
    throw this.createError(lookahead, 'expecting parens');
  }

  matchCurlies() {
    let lookahead = this.peek();
    if (this.isBraces(lookahead)) {
      let inner = this.matchRawDelimiter();
      return inner.slice(1, inner.size - 1);
    }
    throw this.createError(lookahead, 'expecting curly braces');
  }

  matchSquares() {
    let lookahead = this.peek();
    if (this.isBrackets(lookahead)) {
      let inner = this.matchRawDelimiter();
      return inner.slice(1, inner.size - 1);
    }
    throw this.createError(lookahead, 'expecting square braces');
  }

  matchUnaryOperator() {
    let lookahead = this.matchRawSyntax();
    if ((0, _operators.isUnaryOperator)(lookahead)) {
      return lookahead;
    }
    throw this.createError(lookahead, 'expecting a unary operator');
  }

  matchPunctuator(val) {
    let lookahead = this.matchRawSyntax();
    if (this.isPunctuator(lookahead)) {
      if (typeof val !== 'undefined') {
        if (lookahead.val() === val) {
          return lookahead;
        } else {
          throw this.createError(lookahead, 'expecting a ' + val + ' punctuator');
        }
      }
      return lookahead;
    }
    throw this.createError(lookahead, 'expecting a punctuator');
  }

  createError(stx, message) {
    let ctx = '';
    let offending = stx;
    if (this.rest.size > 0) {
      ctx = this.rest.slice(0, 20).map(term => {
        if (term instanceof T.RawDelimiter) {
          return term.inner;
        }
        return _immutable.List.of(term);
      }).flatten().map(s => {
        let sval = s instanceof T.RawSyntax ? s.value.val() : s.toString();
        if (s === offending) {
          return '__' + sval + '__';
        }
        return sval;
      }).join(' ');
    } else {
      ctx = offending.toString();
    }
    return new Error(message + '\n' + ctx);
  }
}
exports.Enforester = Enforester;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9lbmZvcmVzdGVyLmpzIl0sIm5hbWVzIjpbIlQiLCJKdXN0IiwiTm90aGluZyIsIkVYUFJfTE9PUF9PUEVSQVRPUiIsIkVYUFJfTE9PUF9OT19DSEFOR0UiLCJFWFBSX0xPT1BfRVhQQU5TSU9OIiwiZ2V0TGluZU51bWJlciIsIngiLCJzdHgiLCJSYXdTeW50YXgiLCJ2YWx1ZSIsIlJhd0RlbGltaXRlciIsImlubmVyIiwiZmlyc3QiLCJFcnJvciIsImxpbmVOdW1iZXIiLCJFbmZvcmVzdGVyIiwiY29uc3RydWN0b3IiLCJzdHhsIiwicHJldiIsImNvbnRleHQiLCJkb25lIiwiaXNMaXN0IiwidGVybSIsInJlc3QiLCJwZWVrIiwibiIsImdldCIsImFkdmFuY2UiLCJyZXQiLCJlbmZvcmVzdCIsInR5cGUiLCJzaXplIiwiaXNFT0YiLCJFT0YiLCJyZXN1bHQiLCJlbmZvcmVzdEV4cHJlc3Npb25Mb29wIiwiZW5mb3Jlc3RNb2R1bGUiLCJlbmZvcmVzdEJvZHkiLCJlbmZvcmVzdE1vZHVsZUl0ZW0iLCJsb29rYWhlYWQiLCJpc0tleXdvcmQiLCJlbmZvcmVzdEltcG9ydERlY2xhcmF0aW9uIiwiZW5mb3Jlc3RFeHBvcnREZWNsYXJhdGlvbiIsImVuZm9yZXN0U3RhdGVtZW50IiwiaXNQdW5jdHVhdG9yIiwibW9kdWxlU3BlY2lmaWVyIiwiZW5mb3Jlc3RGcm9tQ2xhdXNlIiwiRXhwb3J0QWxsRnJvbSIsImlzQnJhY2VzIiwibmFtZWRFeHBvcnRzIiwiZW5mb3Jlc3RFeHBvcnRDbGF1c2UiLCJpc0lkZW50aWZpZXIiLCJFeHBvcnRGcm9tIiwiRXhwb3J0IiwiZGVjbGFyYXRpb24iLCJlbmZvcmVzdENsYXNzIiwiaXNFeHByIiwiaXNGbkRlY2xUcmFuc2Zvcm0iLCJlbmZvcmVzdEZ1bmN0aW9uIiwiRXhwb3J0RGVmYXVsdCIsImJvZHkiLCJpbkRlZmF1bHQiLCJjb25zdW1lU2VtaWNvbG9uIiwiaXNWYXJEZWNsVHJhbnNmb3JtIiwiaXNMZXREZWNsVHJhbnNmb3JtIiwiaXNDb25zdERlY2xUcmFuc2Zvcm0iLCJpc1N5bnRheHJlY0RlY2xUcmFuc2Zvcm0iLCJpc1N5bnRheERlY2xUcmFuc2Zvcm0iLCJlbmZvcmVzdFZhcmlhYmxlRGVjbGFyYXRpb24iLCJjcmVhdGVFcnJvciIsImVuZiIsIm1hdGNoQ3VybGllcyIsInB1c2giLCJlbmZvcmVzdEV4cG9ydFNwZWNpZmllciIsImNvbnN1bWVDb21tYSIsIm5hbWUiLCJlbmZvcmVzdElkZW50aWZpZXIiLCJleHBvcnRlZE5hbWUiLCJFeHBvcnRTcGVjaWZpZXIiLCJkZWZhdWx0QmluZGluZyIsIm5hbWVkSW1wb3J0cyIsImZvclN5bnRheCIsImlzU3RyaW5nTGl0ZXJhbCIsIkltcG9ydCIsImVuZm9yZXN0QmluZGluZ0lkZW50aWZpZXIiLCJpbXBvcnRzIiwiZW5mb3Jlc3ROYW1lZEltcG9ydHMiLCJmcm9tQ2xhdXNlIiwibmFtZXNwYWNlQmluZGluZyIsImVuZm9yZXN0TmFtZXNwYWNlQmluZGluZyIsIkltcG9ydE5hbWVzcGFjZSIsIm1hdGNoUHVuY3R1YXRvciIsIm1hdGNoSWRlbnRpZmllciIsImVuZm9yZXN0SW1wb3J0U3BlY2lmaWVycyIsIm1hdGNoUmF3U3ludGF4IiwiSW1wb3J0U3BlY2lmaWVyIiwiYmluZGluZyIsIkJpbmRpbmdJZGVudGlmaWVyIiwibWF0Y2hTdHJpbmdMaXRlcmFsIiwiZW5mb3Jlc3RTdGF0ZW1lbnRMaXN0SXRlbSIsImlzQ29tcGlsZXRpbWVUcmFuc2Zvcm0iLCJleHBhbmRNYWNybyIsImlzVGVybSIsIlN0YXRlbWVudCIsImVuZm9yZXN0QmxvY2tTdGF0ZW1lbnQiLCJpc1doaWxlVHJhbnNmb3JtIiwiZW5mb3Jlc3RXaGlsZVN0YXRlbWVudCIsImlzSWZUcmFuc2Zvcm0iLCJlbmZvcmVzdElmU3RhdGVtZW50IiwiaXNGb3JUcmFuc2Zvcm0iLCJlbmZvcmVzdEZvclN0YXRlbWVudCIsImlzU3dpdGNoVHJhbnNmb3JtIiwiZW5mb3Jlc3RTd2l0Y2hTdGF0ZW1lbnQiLCJpc0JyZWFrVHJhbnNmb3JtIiwiZW5mb3Jlc3RCcmVha1N0YXRlbWVudCIsImlzQ29udGludWVUcmFuc2Zvcm0iLCJlbmZvcmVzdENvbnRpbnVlU3RhdGVtZW50IiwiaXNEb1RyYW5zZm9ybSIsImVuZm9yZXN0RG9TdGF0ZW1lbnQiLCJpc0RlYnVnZ2VyVHJhbnNmb3JtIiwiZW5mb3Jlc3REZWJ1Z2dlclN0YXRlbWVudCIsImlzV2l0aFRyYW5zZm9ybSIsImVuZm9yZXN0V2l0aFN0YXRlbWVudCIsImlzVHJ5VHJhbnNmb3JtIiwiZW5mb3Jlc3RUcnlTdGF0ZW1lbnQiLCJpc1Rocm93VHJhbnNmb3JtIiwiZW5mb3Jlc3RUaHJvd1N0YXRlbWVudCIsImVuZm9yZXN0TGFiZWxlZFN0YXRlbWVudCIsInN0bXQiLCJWYXJpYWJsZURlY2xhcmF0aW9uU3RhdGVtZW50IiwiaXNSZXR1cm5TdG10VHJhbnNmb3JtIiwiZW5mb3Jlc3RSZXR1cm5TdGF0ZW1lbnQiLCJFbXB0eVN0YXRlbWVudCIsImVuZm9yZXN0RXhwcmVzc2lvblN0YXRlbWVudCIsImxhYmVsIiwiTGFiZWxlZFN0YXRlbWVudCIsIm1hdGNoS2V5d29yZCIsIkJyZWFrU3RhdGVtZW50IiwiZW5mb3Jlc3RCbG9jayIsImNhdGNoQ2xhdXNlIiwiZW5mb3Jlc3RDYXRjaENsYXVzZSIsImZpbmFsaXplciIsIlRyeUZpbmFsbHlTdGF0ZW1lbnQiLCJUcnlDYXRjaFN0YXRlbWVudCIsImJpbmRpbmdQYXJlbnMiLCJtYXRjaFBhcmVucyIsImVuZm9yZXN0QmluZGluZ1RhcmdldCIsIkNhdGNoQ2xhdXNlIiwiZXhwcmVzc2lvbiIsImVuZm9yZXN0RXhwcmVzc2lvbiIsIlRocm93U3RhdGVtZW50Iiwib2JqUGFyZW5zIiwib2JqZWN0IiwiV2l0aFN0YXRlbWVudCIsIkRlYnVnZ2VyU3RhdGVtZW50IiwidGVzdEJvZHkiLCJ0ZXN0IiwiRG9XaGlsZVN0YXRlbWVudCIsImt3ZCIsIkNvbnRpbnVlU3RhdGVtZW50IiwibGluZU51bWJlckVxIiwiY29uZCIsImRpc2NyaW1pbmFudCIsIlN3aXRjaFN0YXRlbWVudCIsImNhc2VzIiwiZW5mb3Jlc3RTd2l0Y2hDYXNlcyIsImRlZmF1bHRDYXNlIiwiZW5mb3Jlc3RTd2l0Y2hEZWZhdWx0IiwicG9zdERlZmF1bHRDYXNlcyIsIlN3aXRjaFN0YXRlbWVudFdpdGhEZWZhdWx0IiwicHJlRGVmYXVsdENhc2VzIiwiZW5mb3Jlc3RTd2l0Y2hDYXNlIiwiU3dpdGNoQ2FzZSIsImNvbnNlcXVlbnQiLCJlbmZvcmVzdFN3aXRjaENhc2VCb2R5IiwiZW5mb3Jlc3RTdGF0ZW1lbnRMaXN0SW5Td2l0Y2hDYXNlQm9keSIsIlN3aXRjaERlZmF1bHQiLCJpbml0IiwicmlnaHQiLCJsZWZ0IiwidXBkYXRlIiwiY25zdCIsIkZvclN0YXRlbWVudCIsIkZvckluU3RhdGVtZW50IiwiRm9yT2ZTdGF0ZW1lbnQiLCJraW5kIiwiYWx0ZXJuYXRlIiwiSWZTdGF0ZW1lbnQiLCJXaGlsZVN0YXRlbWVudCIsIkJsb2NrU3RhdGVtZW50IiwiYmxvY2siLCJCbG9jayIsInN0YXRlbWVudHMiLCJrdyIsInN1cHIiLCJmcm9tSWRlbnRpZmllciIsImVsZW1lbnRzIiwiaXNTdGF0aWMiLCJtZXRob2RPcktleSIsImVuZm9yZXN0TWV0aG9kRGVmaW5pdGlvbiIsInZhbCIsIkNsYXNzRWxlbWVudCIsIm1ldGhvZCIsIkNsYXNzRXhwcmVzc2lvbiIsIkNsYXNzRGVjbGFyYXRpb24iLCJzdXBlciIsImFsbG93UHVuY3R1YXRvciIsImlzQnJhY2tldHMiLCJlbmZvcmVzdEFycmF5QmluZGluZyIsImVuZm9yZXN0T2JqZWN0QmluZGluZyIsInByb3BlcnRpZXMiLCJlbmZvcmVzdEJpbmRpbmdQcm9wZXJ0eSIsIk9iamVjdEJpbmRpbmciLCJlbmZvcmVzdFByb3BlcnR5TmFtZSIsImRlZmF1bHRWYWx1ZSIsImlzQXNzaWduIiwiZXhwciIsIkJpbmRpbmdQcm9wZXJ0eUlkZW50aWZpZXIiLCJlbmZvcmVzdEJpbmRpbmdFbGVtZW50IiwiQmluZGluZ1Byb3BlcnR5UHJvcGVydHkiLCJicmFja2V0IiwibWF0Y2hTcXVhcmVzIiwicmVzdEVsZW1lbnQiLCJlbCIsIkFycmF5QmluZGluZyIsIkJpbmRpbmdXaXRoRGVmYXVsdCIsImVuZm9yZXN0UHVuY3R1YXRvciIsIlJldHVyblN0YXRlbWVudCIsImtpbmRTeW4iLCJwaGFzZSIsImVudiIsInJlc29sdmUiLCJkZWNscyIsImVuZm9yZXN0VmFyaWFibGVEZWNsYXJhdG9yIiwiaXNTeW50YXgiLCJjb25jYXQiLCJWYXJpYWJsZURlY2xhcmF0aW9uIiwiZGVjbGFyYXRvcnMiLCJpZCIsIlZhcmlhYmxlRGVjbGFyYXRvciIsInN0YXJ0IiwiRXhwcmVzc2lvblN0YXRlbWVudCIsIm9wZXJhdG9yIiwiQmluYXJ5RXhwcmVzc2lvbiIsIm9wQ3R4IiwicHJlYyIsImNvbWJpbmUiLCJzdGFjayIsImVuZm9yZXN0QXNzaWdubWVudEV4cHJlc3Npb24iLCJsYXN0IiwicG9wIiwiaXNNb2R1bGVOYW1lc3BhY2VUcmFuc2Zvcm0iLCJuYW1lc3BhY2UiLCJnZXRGcm9tQ29tcGlsZXRpbWVFbnZpcm9ubWVudCIsIm1vZCIsImV4cG9ydGVkTmFtZXMiLCJmaW5kIiwiZXhOYW1lIiwidW5zaGlmdCIsIkV4cHJlc3Npb24iLCJlbmZvcmVzdFlpZWxkRXhwcmVzc2lvbiIsImlzUGFyZW5zIiwiZW5mb3Jlc3RBcnJvd0V4cHJlc3Npb24iLCJpc1N5bnRheFRlbXBsYXRlIiwiZW5mb3Jlc3RTeW50YXhUZW1wbGF0ZSIsIlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uIiwiaXNOdW1lcmljTGl0ZXJhbCIsImlzVGVtcGxhdGUiLCJpc0Jvb2xlYW5MaXRlcmFsIiwiaXNOdWxsTGl0ZXJhbCIsImlzUmVndWxhckV4cHJlc3Npb24iLCJlbmZvcmVzdFByaW1hcnlFeHByZXNzaW9uIiwiaXNPcGVyYXRvciIsImVuZm9yZXN0VW5hcnlFeHByZXNzaW9uIiwiaXNWYXJCaW5kaW5nVHJhbnNmb3JtIiwibG9va3N0eCIsIm9mIiwiaXNOZXdUcmFuc2Zvcm0iLCJlbmZvcmVzdExlZnRIYW5kU2lkZUV4cHJlc3Npb24iLCJhbGxvd0NhbGwiLCJlbmZvcmVzdFRlbXBsYXRlTGl0ZXJhbCIsImlzVXBkYXRlT3BlcmF0b3IiLCJlbmZvcmVzdFVwZGF0ZUV4cHJlc3Npb24iLCJlbmZvcmVzdEJpbmFyeUV4cHJlc3Npb24iLCJ0cmFuc2Zvcm1EZXN0cnVjdHVyaW5nIiwib3AiLCJBc3NpZ25tZW50RXhwcmVzc2lvbiIsIkNvbXBvdW5kQXNzaWdubWVudEV4cHJlc3Npb24iLCJlbmZvcmVzdENvbmRpdGlvbmFsRXhwcmVzc2lvbiIsImVuZm9yZXN0VGhpc0V4cHJlc3Npb24iLCJlbmZvcmVzdElkZW50aWZpZXJFeHByZXNzaW9uIiwiZW5mb3Jlc3ROdW1lcmljTGl0ZXJhbCIsImVuZm9yZXN0U3RyaW5nTGl0ZXJhbCIsImVuZm9yZXN0Qm9vbGVhbkxpdGVyYWwiLCJlbmZvcmVzdE51bGxMaXRlcmFsIiwiZW5mb3Jlc3RSZWd1bGFyRXhwcmVzc2lvbkxpdGVyYWwiLCJlbmZvcmVzdE9iamVjdEV4cHJlc3Npb24iLCJlbmZvcmVzdEFycmF5RXhwcmVzc2lvbiIsIlN1cGVyIiwiZW5mb3Jlc3ROZXdFeHByZXNzaW9uIiwiZW5mb3Jlc3RDYWxsRXhwcmVzc2lvbiIsImVuZm9yZXN0Q29tcHV0ZWRNZW1iZXJFeHByZXNzaW9uIiwiZW5mb3Jlc3RTdGF0aWNNZW1iZXJFeHByZXNzaW9uIiwiSWRlbnRpZmllckV4cHJlc3Npb24iLCJMaXRlcmFsQm9vbGVhbkV4cHJlc3Npb24iLCJUZW1wbGF0ZUV4cHJlc3Npb24iLCJ0YWciLCJlbmZvcmVzdFRlbXBsYXRlRWxlbWVudHMiLCJMaXRlcmFsU3RyaW5nRXhwcmVzc2lvbiIsIm51bSIsIkxpdGVyYWxJbmZpbml0eUV4cHJlc3Npb24iLCJMaXRlcmFsTnVtZXJpY0V4cHJlc3Npb24iLCJyZVN0eCIsImxhc3RTbGFzaCIsInRva2VuIiwibGFzdEluZGV4T2YiLCJwYXR0ZXJuIiwic2xpY2UiLCJmbGFncyIsIkxpdGVyYWxSZWdFeHBFeHByZXNzaW9uIiwiTGl0ZXJhbE51bGxFeHByZXNzaW9uIiwiVGhpc0V4cHJlc3Npb24iLCJlbmZvcmVzdEFyZ3VtZW50TGlzdCIsImFyZyIsIlNwcmVhZEVsZW1lbnQiLCJOZXdUYXJnZXRFeHByZXNzaW9uIiwiY2FsbGVlIiwiYXJncyIsIk5ld0V4cHJlc3Npb24iLCJhcmd1bWVudHMiLCJDb21wdXRlZE1lbWJlckV4cHJlc3Npb24iLCJ0cmFuc2Zvcm1EZXN0cnVjdHVyaW5nV2l0aERlZmF1bHQiLCJtYXAiLCJ0IiwicGFyZW4iLCJDYWxsRXhwcmVzc2lvbkUiLCJwIiwicGFyYW1zIiwiZW5mb3Jlc3RGb3JtYWxQYXJhbWV0ZXJzIiwiQXJyb3dFeHByZXNzaW9uRSIsIkFycm93RXhwcmVzc2lvbiIsIllpZWxkRXhwcmVzc2lvbiIsImlzR2VuZXJhdG9yIiwiWWllbGRHZW5lcmF0b3JFeHByZXNzaW9uIiwiU3ludGF4VGVtcGxhdGUiLCJ0ZW1wbGF0ZSIsIm1hdGNoUmF3RGVsaW1pdGVyIiwicHJvcGVydHkiLCJTdGF0aWNNZW1iZXJFeHByZXNzaW9uIiwiYXJyIiwiQXJyYXlFeHByZXNzaW9uIiwib2JqIiwibGFzdFByb3AiLCJwcm9wIiwiZW5mb3Jlc3RQcm9wZXJ0eURlZmluaXRpb24iLCJPYmplY3RFeHByZXNzaW9uIiwiU2hvcnRoYW5kUHJvcGVydHkiLCJEYXRhUHJvcGVydHkiLCJpc1Byb3BlcnR5TmFtZSIsIkdldHRlciIsInBhcmFtIiwiU2V0dGVyIiwiZm9ybWFsUGFyYW1zIiwiTWV0aG9kIiwiU3RhdGljUHJvcGVydHlOYW1lIiwiQ29tcHV0ZWRQcm9wZXJ0eU5hbWUiLCJmbktleXdvcmQiLCJGdW5jdGlvbkV4cHJlc3Npb25FIiwiRnVuY3Rpb25EZWNsYXJhdGlvbkUiLCJpdGVtcyIsImVuZm9yZXN0UGFyYW0iLCJGb3JtYWxQYXJhbWV0ZXJzIiwibWF0Y2hVbmFyeU9wZXJhdG9yIiwiVXBkYXRlRXhwcmVzc2lvbiIsImlzUHJlZml4Iiwib3BlcmFuZCIsInJpZ2h0VGVybSIsIlVuYXJ5RXhwcmVzc2lvbiIsIkNvbmRpdGlvbmFsRXhwcmVzc2lvbiIsImxlZnRUZXJtIiwib3BTdHgiLCJtYXRjaFRlbXBsYXRlIiwiaXQiLCJpc0RlbGltaXRlciIsIlRlbXBsYXRlRWxlbWVudCIsInJhd1ZhbHVlIiwidGV4dCIsInN5bnRheFRyYW5zZm9ybSIsInVzZVNpdGVTY29wZSIsImludHJvZHVjZWRTY29wZSIsInVzZVNjb3BlIiwiY3R4IiwiY2FsbCIsInNjb3BlUmVkdWNlciIsInNjb3BlIiwiZmxpcCIsImJpbmRpbmdzIiwidGVybXMiLCJyZWR1Y2UiLCJfcmVzdCIsInNhZmVDaGVjayIsIm1hdGNoIiwic2FmZVJlc29sdmUiLCJpc1RyYW5zZm9ybSIsInRyYW5zIiwic3RvcmUiLCJnZXRPckVsc2UiLCJpc1RyYW5zZm9ybUluc3RhbmNlIiwiaGFzIiwiYSIsImIiLCJtYXRjaExpdGVyYWwiLCJtZXNzYWdlIiwib2ZmZW5kaW5nIiwiZmxhdHRlbiIsInMiLCJzdmFsIiwidG9TdHJpbmciLCJqb2luIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQ0E7O0FBQ0E7O0lBQWtCQSxDOztBQUNsQjs7QUFDQTs7OztBQUlBOztBQXdCQTs7QUFDQTs7QUFDQTs7QUFPQTs7OztBQUdBOztBQUNBOztBQUVBOzs7Ozs7OztBQTFDQSxNQUFNQyxPQUFPLG9CQUFNQSxJQUFuQjtBQUNBLE1BQU1DLFVBQVUsb0JBQU1BLE9BQXRCOztBQTJDQSxNQUFNQyxxQkFBcUIsRUFBM0I7QUFDQSxNQUFNQyxzQkFBc0IsRUFBNUI7QUFDQSxNQUFNQyxzQkFBc0IsRUFBNUI7O0FBRUEsU0FBU0MsYUFBVCxDQUF1QkMsQ0FBdkIsRUFBMkM7QUFDekMsTUFBSUMsR0FBSjtBQUNBLE1BQUlELDZCQUFKLEVBQXlCO0FBQ3ZCQyxVQUFNRCxDQUFOO0FBQ0QsR0FGRCxNQUVPLElBQUlBLGFBQWFQLEVBQUVTLFNBQW5CLEVBQThCO0FBQ25DRCxVQUFNRCxFQUFFRyxLQUFSO0FBQ0QsR0FGTSxNQUVBLElBQUlILGFBQWFQLEVBQUVXLFlB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QUNEO0FBQ0QsZUFBT0EsSUFBUDtBQUNELE9BWEssRUFXSEUsSUFYRyxDQVdFLEdBWEYsQ0FBTjtBQVlELEtBYkQsTUFhTztBQUNMM0IsWUFBTXNCLFVBQVVJLFFBQVYsRUFBTjtBQUNEO0FBQ0QsV0FBTyxJQUFJcFosS0FBSixDQUFVK1ksVUFBVSxJQUFWLEdBQWlCckIsR0FBM0IsQ0FBUDtBQUVEO0FBbnFFcUI7UUFBWHhYLFUsR0FBQUEsVSIsImZpbGUiOiJlbmZvcmVzdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQGZsb3dcbmltcG9ydCB7IGlzSWRlbnRpZmllckV4cHJlc3Npb24sIGlzU3RhdGljTWVtYmVyRXhwcmVzc2lvbiwgaXNDb21wdXRlZE1lbWJlckV4cHJlc3Npb24gfSBmcm9tICcuL3Rlcm1zJztcbmltcG9ydCBUZXJtLCAqIGFzIFQgZnJvbSAnc3dlZXQtc3BlYyc7XG5pbXBvcnQgeyBNYXliZSB9IGZyb20gJ3JhbWRhLWZhbnRhc3knO1xuaW1wb3J0IFNjb3BlUmVkdWNlciBmcm9tICcuL3Njb3BlLXJlZHVjZXInO1xuY29uc3QgSnVzdCA9IE1heWJlLkp1c3Q7XG5jb25zdCBOb3RoaW5nID0gTWF5YmUuTm90aGluZztcblxuaW1wb3J0IHtcbiAgRnVuY3Rpb25EZWNsVHJhbnNmb3JtLFxuICBWYXJpYWJsZURlY2xUcmFuc2Zvcm0sXG4gIE5ld1RyYW5zZm9ybSxcbiAgTGV0RGVjbFRyYW5zZm9ybSxcbiAgQ29uc3REZWNsVHJhbnNmb3JtLFxuICBTeW50YXhEZWNsVHJhbnNmb3JtLFxuICBTeW50YXhyZWNEZWNsVHJhbnNmb3JtLFxuICBSZXR1cm5TdGF0ZW1lbnRUcmFuc2Zvcm0sXG4gIFdoaWxlVHJhbnNmb3JtLFxuICBJZlRyYW5zZm9ybSxcbiAgRm9yVHJhbnNmb3JtLFxuICBTd2l0Y2hUcmFuc2Zvcm0sXG4gIEJyZWFrVHJhbnNmb3JtLFxuICBDb250aW51ZVRyYW5zZm9ybSxcbiAgRG9UcmFuc2Zvcm0sXG4gIERlYnVnZ2VyVHJhbnNmb3JtLFxuICBXaXRoVHJhbnNmb3JtLFxuICBUcnlUcmFuc2Zvcm0sXG4gIFRocm93VHJhbnNmb3JtLFxuICBDb21waWxldGltZVRyYW5zZm9ybSxcbiAgVmFyQmluZGluZ1RyYW5zZm9ybSxcbiAgTW9kdWxlTmFtZXNwYWNlVHJhbnNmb3JtXG59IGZyb20gJy4vdHJhbnNmb3Jtcyc7XG5pbXBvcnQgeyBMaXN0IH0gZnJvbSAnaW1tdXRhYmxlJztcbmltcG9ydCB7IGV4cGVjdCwgYXNzZXJ0IH0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHtcbiAgaXNPcGVyYXRvcixcbiAgaXNVbmFyeU9wZXJhdG9yLFxuICBnZXRPcGVyYXRvckFzc29jLFxuICBnZXRPcGVyYXRvclByZWMsXG4gIG9wZXJhdG9yTHRcbn0gZnJvbSAnLi9vcGVyYXRvcnMnO1xuaW1wb3J0IFN5bnRheCwgeyBBTExfUEhBU0VTIH0gZnJvbSAnLi9zeW50YXgnO1xuaW1wb3J0IHR5cGUgeyBTeW1ib2xDbGFzcyB9IGZyb20gJy4vc3ltYm9sJztcblxuaW1wb3J0IHsgZnJlc2hTY29wZSB9IGZyb20gJy4vc2NvcGUnO1xuaW1wb3J0IHsgc2FuaXRpemVSZXBsYWNlbWVudFZhbHVlcyB9IGZyb20gJy4vbG9hZC1zeW50YXgnO1xuXG5pbXBvcnQgTWFjcm9Db250ZXh0IGZyb20gJy4vbWFjcm8tY29udGV4dCc7XG5cbmNvbnN0IEVYUFJfTE9PUF9PUEVSQVRPUiA9IHt9O1xuY29uc3QgRVhQUl9MT09QX05PX0NIQU5HRSA9IHt9O1xuY29uc3QgRVhQUl9MT09QX0VYUEFOU0lPTiA9IHt9O1xuXG5mdW5jdGlvbiBnZXRMaW5lTnVtYmVyKHg6IFN5bnRheCB8IFQuVGVybSkge1xuICBsZXQgc3R4O1xuICBpZiAoeCBpbnN0YW5jZW9mIFN5bnRheCkge1xuICAgIHN0eCA9IHg7XG4gIH0gZWxzZSBpZiAoeCBpbnN0YW5jZW9mIFQuUmF3U3ludGF4KSB7XG4gICAgc3R4ID0geC52YWx1ZTtcbiAgfSBlbHNlIGlmICh4IGluc3RhbmNlb2YgVC5SYXdEZWxpbWl0ZXIpIHtcbiAgICByZXR1cm4gZ2V0TGluZU51bWJlcih4LmlubmVyLmZpcnN0KCkpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihgTm90IGltcGxlbWVudGVkIHlldCAke3h9YCk7XG4gIH1cbiAgcmV0dXJuIHN0eC5saW5lTnVtYmVyKCk7XG59XG5cbmV4cG9ydCBjbGFzcyBFbmZvcmVzdGVyIHtcbiAgZG9uZTogYm9vbGVhbjtcbiAgdGVybTogP1Rlcm07XG4gIHJlc3Q6IExpc3Q8VGVybT47XG4gIHByZXY6IExpc3Q8VGVybT47XG4gIGNvbnRleHQ6IHtcbiAgICBlbnY6IE1hcDxzdHJpbmcsIGFueT47XG4gICAgc3RvcmU6IE1hcDxzdHJpbmcsIGFueT47XG4gICAgcGhhc2U6IG51bWJlciB8IHt9O1xuICAgIHVzZVNjb3BlOiBTeW1ib2xDbGFzcztcbiAgICBiaW5kaW5nczogYW55O1xuICB9O1xuICBvcEN0eDoge1xuICAgIHByZWM6IG51bWJlcixcbiAgICBjb21iaW5lOiAoeDogYW55KSA9PiBhbnksXG4gICAgc3RhY2s6IExpc3Q8Kj5cbiAgfTtcblxuICBjb25zdHJ1Y3RvcihzdHhsOiBMaXN0PFRlcm0+LCBwcmV2OiBMaXN0PFRlcm0+LCBjb250ZXh0OiBhbnkpIHtcbiAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICBhc3NlcnQoTGlzdC5pc0xpc3Qoc3R4bCksICdleHBlY3RpbmcgYSBsaXN0IG9mIHRlcm1zIHRvIGVuZm9yZXN0Jyk7XG4gICAgYXNzZXJ0KExpc3QuaXNMaXN0KHByZXYpLCAnZXhwZWN0aW5nIGEgbGlzdCBvZiB0ZXJtcyB0byBlbmZvcmVzdCcpO1xuICAgIGFzc2VydChjb250ZXh0LCAnZXhwZWN0aW5nIGEgY29udGV4dCB0byBlbmZvcmVzdCcpO1xuICAgIHRoaXMudGVybSA9IG51bGw7XG5cbiAgICB0aGlzLnJlc3QgPSBzdHhsO1xuICAgIHRoaXMucHJldiA9IHByZXY7XG5cbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB9XG5cbiAgcGVlayhuOiBudW1iZXIgPSAwKTogP1Rlcm0ge1xuICAgIHJldHVybiB0aGlzLnJlc3QuZ2V0KG4pO1xuICB9XG5cbiAgYWR2YW5jZSgpIHtcbiAgICBsZXQgcmV0OiA/VGVybSA9IHRoaXMucmVzdC5maXJzdCgpO1xuICAgIHRoaXMucmVzdCA9IHRoaXMucmVzdC5yZXN0KCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8qXG4gICBlbmZvcmVzdCB3b3JrcyBvdmVyOlxuICAgcHJldiAtIGEgbGlzdCBvZiB0aGUgcHJldmlvdXNseSBlbmZvcmVzdCBUZXJtc1xuICAgdGVybSAtIHRoZSBjdXJyZW50IHRlcm0gYmVpbmcgZW5mb3Jlc3RlZCAoaW5pdGlhbGx5IG51bGwpXG4gICByZXN0IC0gcmVtYWluaW5nIFRlcm1zIHRvIGVuZm9yZXN0XG4gICAqL1xuICBlbmZvcmVzdCh0eXBlPzogJ2V4cHJlc3Npb24nIHwgJ01vZHVsZScgPSAnTW9kdWxlJykge1xuICAgIC8vIGluaXRpYWxpemUgdGhlIHRlcm1cbiAgICB0aGlzLnRlcm0gPSBudWxsO1xuXG4gICAgaWYgKHRoaXMucmVzdC5zaXplID09PSAwKSB7XG4gICAgICB0aGlzLmRvbmUgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXMudGVybTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0VPRih0aGlzLnBlZWsoKSkpIHtcbiAgICAgIHRoaXMudGVybSA9IG5ldyBULkVPRih7fSk7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIHJldHVybiB0aGlzLnRlcm07XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAodHlwZSA9PT0gJ2V4cHJlc3Npb24nKSB7XG4gICAgICByZXN1bHQgPSB0aGlzLmVuZm9yZXN0RXhwcmVzc2lvbkxvb3AoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gdGhpcy5lbmZvcmVzdE1vZHVsZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJlc3Quc2l6ZSA9PT0gMCkge1xuICAgICAgdGhpcy5kb25lID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGVuZm9yZXN0TW9kdWxlKCkge1xuICAgIHJldHVybiB0aGlzLmVuZm9yZXN0Qm9keSgpO1xuICB9XG5cbiAgZW5mb3Jlc3RCb2R5KCkge1xuICAgIHJldHVybiB0aGlzLmVuZm9yZXN0TW9kdWxlSXRlbSgpO1xuICB9XG5cbiAgZW5mb3Jlc3RNb2R1bGVJdGVtKCkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAodGhpcy5pc0tleXdvcmQobG9va2FoZWFkLCAnaW1wb3J0JykpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RJbXBvcnREZWNsYXJhdGlvbigpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0tleXdvcmQobG9va2FoZWFkLCAnZXhwb3J0JykpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RFeHBvcnREZWNsYXJhdGlvbigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lbmZvcmVzdFN0YXRlbWVudCgpO1xuICB9XG5cbiAgZW5mb3Jlc3RFeHBvcnREZWNsYXJhdGlvbigpIHtcbiAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgaWYgKHRoaXMuaXNQdW5jdHVhdG9yKGxvb2thaGVhZCwgJyonKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICBsZXQgbW9kdWxlU3BlY2lmaWVyID0gdGhpcy5lbmZvcmVzdEZyb21DbGF1c2UoKTtcbiAgICAgIHJldHVybiBuZXcgVC5FeHBvcnRBbGxGcm9tKHsgbW9kdWxlU3BlY2lmaWVyIH0pO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0JyYWNlcyhsb29rYWhlYWQpKSB7XG4gICAgICBsZXQgbmFtZWRFeHBvcnRzID0gdGhpcy5lbmZvcmVzdEV4cG9ydENsYXVzZSgpO1xuICAgICAgbGV0IG1vZHVsZVNwZWNpZmllciA9IG51bGw7XG4gICAgICBpZiAodGhpcy5pc0lkZW50aWZpZXIodGhpcy5wZWVrKCksICdmcm9tJykpIHtcbiAgICAgICAgbW9kdWxlU3BlY2lmaWVyID0gdGhpcy5lbmZvcmVzdEZyb21DbGF1c2UoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgVC5FeHBvcnRGcm9tKHsgbmFtZWRFeHBvcnRzLCBtb2R1bGVTcGVjaWZpZXIgfSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsICdjbGFzcycpKSB7XG4gICAgICByZXR1cm4gbmV3IFQuRXhwb3J0KHtcbiAgICAgICAgZGVjbGFyYXRpb246IHRoaXMuZW5mb3Jlc3RDbGFzcyh7IGlzRXhwcjogZmFsc2UgfSlcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0ZuRGVjbFRyYW5zZm9ybShsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gbmV3IFQuRXhwb3J0KHtcbiAgICAgICAgZGVjbGFyYXRpb246IHRoaXMuZW5mb3Jlc3RGdW5jdGlvbih7aXNFeHByOiBmYWxzZX0pXG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCwgJ2RlZmF1bHQnKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICBpZiAodGhpcy5pc0ZuRGVjbFRyYW5zZm9ybSh0aGlzLnBlZWsoKSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBULkV4cG9ydERlZmF1bHQoe1xuICAgICAgICAgIGJvZHk6IHRoaXMuZW5mb3Jlc3RGdW5jdGlvbih7aXNFeHByOiBmYWxzZSwgaW5EZWZhdWx0OiB0cnVlfSlcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuaXNLZXl3b3JkKHRoaXMucGVlaygpLCAnY2xhc3MnKSkge1xuICAgICAgICByZXR1cm4gbmV3IFQuRXhwb3J0RGVmYXVsdCh7XG4gICAgICAgICAgYm9keTogdGhpcy5lbmZvcmVzdENsYXNzKHtpc0V4cHI6IGZhbHNlLCBpbkRlZmF1bHQ6IHRydWV9KVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBib2R5ID0gdGhpcy5lbmZvcmVzdEV4cHJlc3Npb25Mb29wKCk7XG4gICAgICAgIHRoaXMuY29uc3VtZVNlbWljb2xvbigpO1xuICAgICAgICByZXR1cm4gbmV3IFQuRXhwb3J0RGVmYXVsdCh7IGJvZHkgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzVmFyRGVjbFRyYW5zZm9ybShsb29rYWhlYWQpIHx8XG4gICAgICAgIHRoaXMuaXNMZXREZWNsVHJhbnNmb3JtKGxvb2thaGVhZCkgfHxcbiAgICAgICAgdGhpcy5pc0NvbnN0RGVjbFRyYW5zZm9ybShsb29rYWhlYWQpIHx8XG4gICAgICAgIHRoaXMuaXNTeW50YXhyZWNEZWNsVHJhbnNmb3JtKGxvb2thaGVhZCkgfHxcbiAgICAgICAgdGhpcy5pc1N5bnRheERlY2xUcmFuc2Zvcm0obG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIG5ldyBULkV4cG9ydCh7XG4gICAgICAgIGRlY2xhcmF0aW9uOiB0aGlzLmVuZm9yZXN0VmFyaWFibGVEZWNsYXJhdGlvbigpXG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihsb29rYWhlYWQsICd1bmV4cGVjdGVkIHN5bnRheCcpO1xuICB9XG5cbiAgZW5mb3Jlc3RFeHBvcnRDbGF1c2UoKSB7XG4gICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKHRoaXMubWF0Y2hDdXJsaWVzKCksIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgd2hpbGUgKGVuZi5yZXN0LnNpemUgIT09IDApIHtcbiAgICAgIHJlc3VsdC5wdXNoKGVuZi5lbmZvcmVzdEV4cG9ydFNwZWNpZmllcigpKTtcbiAgICAgIGVuZi5jb25zdW1lQ29tbWEoKTtcbiAgICB9XG4gICAgcmV0dXJuIExpc3QocmVzdWx0KTtcbiAgfVxuXG4gIGVuZm9yZXN0RXhwb3J0U3BlY2lmaWVyKCkge1xuICAgIGxldCBuYW1lID0gdGhpcy5lbmZvcmVzdElkZW50aWZpZXIoKTtcbiAgICBpZiAodGhpcy5pc0lkZW50aWZpZXIodGhpcy5wZWVrKCksICdhcycpKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIGxldCBleHBvcnRlZE5hbWUgPSB0aGlzLmVuZm9yZXN0SWRlbnRpZmllcigpO1xuICAgICAgcmV0dXJuIG5ldyBULkV4cG9ydFNwZWNpZmllcih7IG5hbWUsIGV4cG9ydGVkTmFtZSB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBULkV4cG9ydFNwZWNpZmllcih7XG4gICAgICBuYW1lOiBudWxsLFxuICAgICAgZXhwb3J0ZWROYW1lOiBuYW1lXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdEltcG9ydERlY2xhcmF0aW9uKCkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcbiAgICBsZXQgZGVmYXVsdEJpbmRpbmcgPSBudWxsO1xuICAgIGxldCBuYW1lZEltcG9ydHMgPSBMaXN0KCk7XG4gICAgbGV0IGZvclN5bnRheCA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMuaXNTdHJpbmdMaXRlcmFsKGxvb2thaGVhZCkpIHtcbiAgICAgIGxldCBtb2R1bGVTcGVjaWZpZXIgPSB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIHRoaXMuY29uc3VtZVNlbWljb2xvbigpO1xuICAgICAgcmV0dXJuIG5ldyBULkltcG9ydCh7XG4gICAgICAgIGRlZmF1bHRCaW5kaW5nLFxuICAgICAgICBuYW1lZEltcG9ydHMsXG4gICAgICAgIG1vZHVsZVNwZWNpZmllcixcbiAgICAgICAgZm9yU3ludGF4XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5pc0lkZW50aWZpZXIobG9va2FoZWFkKSB8fCB0aGlzLmlzS2V5d29yZChsb29rYWhlYWQpKSB7XG4gICAgICBkZWZhdWx0QmluZGluZyA9IHRoaXMuZW5mb3Jlc3RCaW5kaW5nSWRlbnRpZmllcigpO1xuICAgICAgaWYgKCF0aGlzLmlzUHVuY3R1YXRvcih0aGlzLnBlZWsoKSwgJywnKSkge1xuICAgICAgICBsZXQgbW9kdWxlU3BlY2lmaWVyID0gdGhpcy5lbmZvcmVzdEZyb21DbGF1c2UoKTtcbiAgICAgICAgaWYgKHRoaXMuaXNLZXl3b3JkKHRoaXMucGVlaygpLCAnZm9yJykgJiYgdGhpcy5pc0lkZW50aWZpZXIodGhpcy5wZWVrKDEpLCAnc3ludGF4JykpIHtcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICBmb3JTeW50YXggPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ldyBULkltcG9ydCh7XG4gICAgICAgICAgZGVmYXVsdEJpbmRpbmcsIG1vZHVsZVNwZWNpZmllcixcbiAgICAgICAgICBuYW1lZEltcG9ydHM6IExpc3QoKSxcbiAgICAgICAgICBmb3JTeW50YXhcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuY29uc3VtZUNvbW1hKCk7XG4gICAgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgaWYgKHRoaXMuaXNCcmFjZXMobG9va2FoZWFkKSkge1xuICAgICAgbGV0IGltcG9ydHMgPSB0aGlzLmVuZm9yZXN0TmFtZWRJbXBvcnRzKCk7XG4gICAgICBsZXQgZnJvbUNsYXVzZSA9IHRoaXMuZW5mb3Jlc3RGcm9tQ2xhdXNlKCk7XG4gICAgICBpZiAodGhpcy5pc0tleXdvcmQodGhpcy5wZWVrKCksICdmb3InKSAmJiB0aGlzLmlzSWRlbnRpZmllcih0aGlzLnBlZWsoMSksICdzeW50YXgnKSkge1xuICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgIGZvclN5bnRheCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgVC5JbXBvcnQoe1xuICAgICAgICBkZWZhdWx0QmluZGluZyxcbiAgICAgICAgZm9yU3ludGF4LFxuICAgICAgICBuYW1lZEltcG9ydHM6IGltcG9ydHMsXG4gICAgICAgIG1vZHVsZVNwZWNpZmllcjogZnJvbUNsYXVzZVxuXG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNQdW5jdHVhdG9yKGxvb2thaGVhZCwgJyonKSkge1xuICAgICAgbGV0IG5hbWVzcGFjZUJpbmRpbmcgPSB0aGlzLmVuZm9yZXN0TmFtZXNwYWNlQmluZGluZygpO1xuICAgICAgbGV0IG1vZHVsZVNwZWNpZmllciA9IHRoaXMuZW5mb3Jlc3RGcm9tQ2xhdXNlKCk7XG4gICAgICBpZiAodGhpcy5pc0tleXdvcmQodGhpcy5wZWVrKCksICdmb3InKSAmJiB0aGlzLmlzSWRlbnRpZmllcih0aGlzLnBlZWsoMSksICdzeW50YXgnKSkge1xuICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgIGZvclN5bnRheCA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFQuSW1wb3J0TmFtZXNwYWNlKHtcbiAgICAgICAgZGVmYXVsdEJpbmRpbmcsIGZvclN5bnRheCwgbmFtZXNwYWNlQmluZGluZywgbW9kdWxlU3BlY2lmaWVyXG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihsb29rYWhlYWQsICd1bmV4cGVjdGVkIHN5bnRheCcpO1xuICB9XG5cbiAgZW5mb3Jlc3ROYW1lc3BhY2VCaW5kaW5nKCkge1xuICAgIHRoaXMubWF0Y2hQdW5jdHVhdG9yKCcqJyk7XG4gICAgdGhpcy5tYXRjaElkZW50aWZpZXIoJ2FzJyk7XG4gICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RCaW5kaW5nSWRlbnRpZmllcigpO1xuICB9XG5cbiAgZW5mb3Jlc3ROYW1lZEltcG9ydHMoKSB7XG4gICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKHRoaXMubWF0Y2hDdXJsaWVzKCksIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgd2hpbGUgKGVuZi5yZXN0LnNpemUgIT09IDApIHtcbiAgICAgIHJlc3VsdC5wdXNoKGVuZi5lbmZvcmVzdEltcG9ydFNwZWNpZmllcnMoKSk7XG4gICAgICBlbmYuY29uc3VtZUNvbW1hKCk7XG4gICAgfVxuICAgIHJldHVybiBMaXN0KHJlc3VsdCk7XG4gIH1cblxuICBlbmZvcmVzdEltcG9ydFNwZWNpZmllcnMoKSB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgIGxldCBuYW1lO1xuICAgIGlmICh0aGlzLmlzSWRlbnRpZmllcihsb29rYWhlYWQpIHx8IHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCkpIHtcbiAgICAgIG5hbWUgPSB0aGlzLm1hdGNoUmF3U3ludGF4KCk7XG4gICAgICBpZiAoIXRoaXMuaXNJZGVudGlmaWVyKHRoaXMucGVlaygpLCAnYXMnKSkge1xuICAgICAgICByZXR1cm4gbmV3IFQuSW1wb3J0U3BlY2lmaWVyKHtcbiAgICAgICAgICBuYW1lOiBudWxsLFxuICAgICAgICAgIGJpbmRpbmc6IG5ldyBULkJpbmRpbmdJZGVudGlmaWVyKHtcbiAgICAgICAgICAgIG5hbWU6IG5hbWVcbiAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubWF0Y2hJZGVudGlmaWVyKCdhcycpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKGxvb2thaGVhZCwgJ3VuZXhwZWN0ZWQgdG9rZW4gaW4gaW1wb3J0IHNwZWNpZmllcicpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFQuSW1wb3J0U3BlY2lmaWVyKHtcbiAgICAgIG5hbWUsIGJpbmRpbmc6IHRoaXMuZW5mb3Jlc3RCaW5kaW5nSWRlbnRpZmllcigpXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdEZyb21DbGF1c2UoKSB7XG4gICAgdGhpcy5tYXRjaElkZW50aWZpZXIoJ2Zyb20nKTtcbiAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5tYXRjaFN0cmluZ0xpdGVyYWwoKTtcbiAgICB0aGlzLmNvbnN1bWVTZW1pY29sb24oKTtcbiAgICByZXR1cm4gbG9va2FoZWFkO1xuICB9XG5cbiAgZW5mb3Jlc3RTdGF0ZW1lbnRMaXN0SXRlbSgpIHtcbiAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG5cbiAgICBpZiAodGhpcy5pc0ZuRGVjbFRyYW5zZm9ybShsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdEZ1bmN0aW9uKHsgaXNFeHByOiBmYWxzZSB9KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCwgJ2NsYXNzJykpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0Q2xhc3MoeyBpc0V4cHI6IGZhbHNlIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdFN0YXRlbWVudCgpO1xuICAgIH1cbiAgfVxuXG4gIGVuZm9yZXN0U3RhdGVtZW50KCkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcblxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc0NvbXBpbGV0aW1lVHJhbnNmb3JtKGxvb2thaGVhZCkpIHtcbiAgICAgIHRoaXMuZXhwYW5kTWFjcm8oKTtcbiAgICAgIGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc1Rlcm0obG9va2FoZWFkKSAmJiBsb29rYWhlYWQgaW5zdGFuY2VvZiBULlN0YXRlbWVudCkge1xuICAgICAgLy8gVE9ETzogY2hlY2sgdGhhdCB0aGlzIGlzIGFjdHVhbGx5IGFuIHN0YXRlbWVudFxuICAgICAgcmV0dXJuIHRoaXMuYWR2YW5jZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc0JyYWNlcyhsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdEJsb2NrU3RhdGVtZW50KCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiB0aGlzLmlzV2hpbGVUcmFuc2Zvcm0obG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RXaGlsZVN0YXRlbWVudCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc0lmVHJhbnNmb3JtKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0SWZTdGF0ZW1lbnQoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiB0aGlzLmlzRm9yVHJhbnNmb3JtKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0Rm9yU3RhdGVtZW50KCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc1N3aXRjaFRyYW5zZm9ybShsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdFN3aXRjaFN0YXRlbWVudCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNCcmVha1RyYW5zZm9ybShsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdEJyZWFrU3RhdGVtZW50KCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc0NvbnRpbnVlVHJhbnNmb3JtKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0Q29udGludWVTdGF0ZW1lbnQoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiB0aGlzLmlzRG9UcmFuc2Zvcm0obG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3REb1N0YXRlbWVudCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNEZWJ1Z2dlclRyYW5zZm9ybShsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdERlYnVnZ2VyU3RhdGVtZW50KCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc1dpdGhUcmFuc2Zvcm0obG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RXaXRoU3RhdGVtZW50KCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc1RyeVRyYW5zZm9ybShsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdFRyeVN0YXRlbWVudCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNUaHJvd1RyYW5zZm9ybShsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdFRocm93U3RhdGVtZW50KCk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogcHV0IHNvbWV3aGVyZSBlbHNlXG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiB0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsICdjbGFzcycpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdENsYXNzKHtpc0V4cHI6IGZhbHNlfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiB0aGlzLmlzRm5EZWNsVHJhbnNmb3JtKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0RnVuY3Rpb24oe2lzRXhwcjogZmFsc2V9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNJZGVudGlmaWVyKGxvb2thaGVhZCkgJiZcbiAgICAgICAgdGhpcy5pc1B1bmN0dWF0b3IodGhpcy5wZWVrKDEpLCAnOicpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdExhYmVsZWRTdGF0ZW1lbnQoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmXG4gICAgICAgICh0aGlzLmlzVmFyRGVjbFRyYW5zZm9ybShsb29rYWhlYWQpIHx8XG4gICAgICAgICB0aGlzLmlzTGV0RGVjbFRyYW5zZm9ybShsb29rYWhlYWQpIHx8XG4gICAgICAgICB0aGlzLmlzQ29uc3REZWNsVHJhbnNmb3JtKGxvb2thaGVhZCkgfHxcbiAgICAgICAgIHRoaXMuaXNTeW50YXhyZWNEZWNsVHJhbnNmb3JtKGxvb2thaGVhZCkgfHxcbiAgICAgICAgIHRoaXMuaXNTeW50YXhEZWNsVHJhbnNmb3JtKGxvb2thaGVhZCkpKSB7XG4gICAgICBsZXQgc3RtdCA9IG5ldyBULlZhcmlhYmxlRGVjbGFyYXRpb25TdGF0ZW1lbnQoe1xuICAgICAgICBkZWNsYXJhdGlvbjogdGhpcy5lbmZvcmVzdFZhcmlhYmxlRGVjbGFyYXRpb24oKVxuICAgICAgfSk7XG4gICAgICB0aGlzLmNvbnN1bWVTZW1pY29sb24oKTtcbiAgICAgIHJldHVybiBzdG10O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc1JldHVyblN0bXRUcmFuc2Zvcm0obG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RSZXR1cm5TdGF0ZW1lbnQoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNQdW5jdHVhdG9yKGxvb2thaGVhZCwgJzsnKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICByZXR1cm4gbmV3IFQuRW1wdHlTdGF0ZW1lbnQoe30pO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RFeHByZXNzaW9uU3RhdGVtZW50KCk7XG4gIH1cblxuICBlbmZvcmVzdExhYmVsZWRTdGF0ZW1lbnQoKSB7XG4gICAgbGV0IGxhYmVsID0gdGhpcy5tYXRjaElkZW50aWZpZXIoKTtcbiAgICB0aGlzLm1hdGNoUHVuY3R1YXRvcignOicpO1xuICAgIGxldCBzdG10ID0gdGhpcy5lbmZvcmVzdFN0YXRlbWVudCgpO1xuXG4gICAgcmV0dXJuIG5ldyBULkxhYmVsZWRTdGF0ZW1lbnQoe1xuICAgICAgbGFiZWw6IGxhYmVsLFxuICAgICAgYm9keTogc3RtdFxuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RCcmVha1N0YXRlbWVudCgpIHtcbiAgICB0aGlzLm1hdGNoS2V5d29yZCgnYnJlYWsnKTtcbiAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgbGV0IGxhYmVsID0gbnVsbDtcbiAgICBpZiAodGhpcy5yZXN0LnNpemUgPT09IDAgfHwgdGhpcy5pc1B1bmN0dWF0b3IobG9va2FoZWFkLCAnOycpKSB7XG4gICAgICB0aGlzLmNvbnN1bWVTZW1pY29sb24oKTtcbiAgICAgIHJldHVybiBuZXcgVC5CcmVha1N0YXRlbWVudCh7IGxhYmVsIH0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc0lkZW50aWZpZXIobG9va2FoZWFkKSB8fCB0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsICd5aWVsZCcpIHx8IHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCwgJ2xldCcpKSB7XG4gICAgICBsYWJlbCA9IHRoaXMuZW5mb3Jlc3RJZGVudGlmaWVyKCk7XG4gICAgfVxuICAgIHRoaXMuY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgcmV0dXJuIG5ldyBULkJyZWFrU3RhdGVtZW50KHsgbGFiZWwgfSk7XG4gIH1cblxuICBlbmZvcmVzdFRyeVN0YXRlbWVudCgpIHtcbiAgICB0aGlzLm1hdGNoS2V5d29yZCgndHJ5Jyk7XG4gICAgbGV0IGJvZHkgPSB0aGlzLmVuZm9yZXN0QmxvY2soKTtcbiAgICBpZiAodGhpcy5pc0tleXdvcmQodGhpcy5wZWVrKCksICdjYXRjaCcpKSB7XG4gICAgICBsZXQgY2F0Y2hDbGF1c2UgPSB0aGlzLmVuZm9yZXN0Q2F0Y2hDbGF1c2UoKTtcbiAgICAgIGlmICh0aGlzLmlzS2V5d29yZCh0aGlzLnBlZWsoKSwgJ2ZpbmFsbHknKSkge1xuICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgbGV0IGZpbmFsaXplciA9IHRoaXMuZW5mb3Jlc3RCbG9jaygpO1xuICAgICAgICByZXR1cm4gbmV3IFQuVHJ5RmluYWxseVN0YXRlbWVudCh7XG4gICAgICAgICAgYm9keSwgY2F0Y2hDbGF1c2UsIGZpbmFsaXplclxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgVC5UcnlDYXRjaFN0YXRlbWVudCh7IGJvZHksIGNhdGNoQ2xhdXNlIH0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc0tleXdvcmQodGhpcy5wZWVrKCksICdmaW5hbGx5JykpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgbGV0IGZpbmFsaXplciA9IHRoaXMuZW5mb3Jlc3RCbG9jaygpO1xuICAgICAgcmV0dXJuIG5ldyBULlRyeUZpbmFsbHlTdGF0ZW1lbnQoeyBib2R5LCBjYXRjaENsYXVzZTogbnVsbCwgZmluYWxpemVyIH0pO1xuICAgIH1cbiAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKHRoaXMucGVlaygpLCAndHJ5IHdpdGggbm8gY2F0Y2ggb3IgZmluYWxseScpO1xuICB9XG5cbiAgZW5mb3Jlc3RDYXRjaENsYXVzZSgpIHtcbiAgICB0aGlzLm1hdGNoS2V5d29yZCgnY2F0Y2gnKTtcbiAgICBsZXQgYmluZGluZ1BhcmVucyA9IHRoaXMubWF0Y2hQYXJlbnMoKTtcbiAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIoYmluZGluZ1BhcmVucywgTGlzdCgpLCB0aGlzLmNvbnRleHQpO1xuICAgIGxldCBiaW5kaW5nID0gZW5mLmVuZm9yZXN0QmluZGluZ1RhcmdldCgpO1xuICAgIGxldCBib2R5ID0gdGhpcy5lbmZvcmVzdEJsb2NrKCk7XG4gICAgcmV0dXJuIG5ldyBULkNhdGNoQ2xhdXNlKHsgYmluZGluZywgYm9keSB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0VGhyb3dTdGF0ZW1lbnQoKSB7XG4gICAgdGhpcy5tYXRjaEtleXdvcmQoJ3Rocm93Jyk7XG4gICAgbGV0IGV4cHJlc3Npb24gPSB0aGlzLmVuZm9yZXN0RXhwcmVzc2lvbigpO1xuICAgIHRoaXMuY29uc3VtZVNlbWljb2xvbigpO1xuICAgIHJldHVybiBuZXcgVC5UaHJvd1N0YXRlbWVudCh7IGV4cHJlc3Npb24gfSk7XG4gIH1cblxuICBlbmZvcmVzdFdpdGhTdGF0ZW1lbnQoKSB7XG4gICAgdGhpcy5tYXRjaEtleXdvcmQoJ3dpdGgnKTtcbiAgICBsZXQgb2JqUGFyZW5zID0gdGhpcy5tYXRjaFBhcmVucygpO1xuICAgIGxldCBlbmYgPSBuZXcgRW5mb3Jlc3RlcihvYmpQYXJlbnMsIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICBsZXQgb2JqZWN0ID0gZW5mLmVuZm9yZXN0RXhwcmVzc2lvbigpO1xuICAgIGxldCBib2R5ID0gdGhpcy5lbmZvcmVzdFN0YXRlbWVudCgpO1xuICAgIHJldHVybiBuZXcgVC5XaXRoU3RhdGVtZW50KHsgb2JqZWN0LCBib2R5IH0pO1xuICB9XG5cbiAgZW5mb3Jlc3REZWJ1Z2dlclN0YXRlbWVudCgpIHtcbiAgICB0aGlzLm1hdGNoS2V5d29yZCgnZGVidWdnZXInKTtcblxuICAgIHJldHVybiBuZXcgVC5EZWJ1Z2dlclN0YXRlbWVudCh7fSk7XG4gIH1cblxuICBlbmZvcmVzdERvU3RhdGVtZW50KCkge1xuICAgIHRoaXMubWF0Y2hLZXl3b3JkKCdkbycpO1xuICAgIGxldCBib2R5ID0gdGhpcy5lbmZvcmVzdFN0YXRlbWVudCgpO1xuICAgIHRoaXMubWF0Y2hLZXl3b3JkKCd3aGlsZScpO1xuICAgIGxldCB0ZXN0Qm9keSA9IHRoaXMubWF0Y2hQYXJlbnMoKTtcbiAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIodGVzdEJvZHksIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICBsZXQgdGVzdCA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb24oKTtcbiAgICB0aGlzLmNvbnN1bWVTZW1pY29sb24oKTtcbiAgICByZXR1cm4gbmV3IFQuRG9XaGlsZVN0YXRlbWVudCh7IGJvZHksIHRlc3QgfSk7XG4gIH1cblxuICBlbmZvcmVzdENvbnRpbnVlU3RhdGVtZW50KCkge1xuICAgIGxldCBrd2QgPSB0aGlzLm1hdGNoS2V5d29yZCgnY29udGludWUnKTtcbiAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgbGV0IGxhYmVsID0gbnVsbDtcbiAgICBpZiAodGhpcy5yZXN0LnNpemUgPT09IDAgfHwgdGhpcy5pc1B1bmN0dWF0b3IobG9va2FoZWFkLCAnOycpKSB7XG4gICAgICB0aGlzLmNvbnN1bWVTZW1pY29sb24oKTtcbiAgICAgIHJldHVybiBuZXcgVC5Db250aW51ZVN0YXRlbWVudCh7IGxhYmVsIH0pO1xuICAgIH1cbiAgICBpZiAoKGxvb2thaGVhZCBpbnN0YW5jZW9mIFQuUmF3U3ludGF4ICYmIHRoaXMubGluZU51bWJlckVxKGt3ZCwgbG9va2FoZWFkKSkgJiZcbiAgICAgICAgKHRoaXMuaXNJZGVudGlmaWVyKGxvb2thaGVhZCkgfHxcbiAgICAgICAgIHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCwgJ3lpZWxkJykgfHxcbiAgICAgICAgIHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCwgJ2xldCcpKSkge1xuICAgICAgbGFiZWwgPSB0aGlzLmVuZm9yZXN0SWRlbnRpZmllcigpO1xuICAgIH1cbiAgICB0aGlzLmNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgIHJldHVybiBuZXcgVC5Db250aW51ZVN0YXRlbWVudCh7IGxhYmVsIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RTd2l0Y2hTdGF0ZW1lbnQoKSB7XG4gICAgdGhpcy5tYXRjaEtleXdvcmQoJ3N3aXRjaCcpO1xuICAgIGxldCBjb25kID0gdGhpcy5tYXRjaFBhcmVucygpO1xuICAgIGxldCBlbmYgPSBuZXcgRW5mb3Jlc3Rlcihjb25kLCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG4gICAgbGV0IGRpc2NyaW1pbmFudCA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb24oKTtcbiAgICBsZXQgYm9keSA9IHRoaXMubWF0Y2hDdXJsaWVzKCk7XG5cbiAgICBpZiAoYm9keS5zaXplID09PSAwKSB7XG4gICAgICByZXR1cm4gbmV3IFQuU3dpdGNoU3RhdGVtZW50KHtcbiAgICAgICAgZGlzY3JpbWluYW50OiBkaXNjcmltaW5hbnQsXG4gICAgICAgIGNhc2VzOiBMaXN0KClcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbmYgPSBuZXcgRW5mb3Jlc3Rlcihib2R5LCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG4gICAgbGV0IGNhc2VzID0gZW5mLmVuZm9yZXN0U3dpdGNoQ2FzZXMoKTtcbiAgICBsZXQgbG9va2FoZWFkID0gZW5mLnBlZWsoKTtcbiAgICBpZiAoZW5mLmlzS2V5d29yZChsb29rYWhlYWQsICdkZWZhdWx0JykpIHtcbiAgICAgIGxldCBkZWZhdWx0Q2FzZSA9IGVuZi5lbmZvcmVzdFN3aXRjaERlZmF1bHQoKTtcbiAgICAgIGxldCBwb3N0RGVmYXVsdENhc2VzID0gZW5mLmVuZm9yZXN0U3dpdGNoQ2FzZXMoKTtcbiAgICAgIHJldHVybiBuZXcgVC5Td2l0Y2hTdGF0ZW1lbnRXaXRoRGVmYXVsdCh7XG4gICAgICAgIGRpc2NyaW1pbmFudCxcbiAgICAgICAgcHJlRGVmYXVsdENhc2VzOiBjYXNlcyxcbiAgICAgICAgZGVmYXVsdENhc2UsXG4gICAgICAgIHBvc3REZWZhdWx0Q2FzZXNcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFQuU3dpdGNoU3RhdGVtZW50KHsgIGRpc2NyaW1pbmFudCwgY2FzZXMgfSk7XG4gIH1cblxuICBlbmZvcmVzdFN3aXRjaENhc2VzKCkge1xuICAgIGxldCBjYXNlcyA9IFtdO1xuICAgIHdoaWxlICghKHRoaXMucmVzdC5zaXplID09PSAwIHx8IHRoaXMuaXNLZXl3b3JkKHRoaXMucGVlaygpLCAnZGVmYXVsdCcpKSkge1xuICAgICAgY2FzZXMucHVzaCh0aGlzLmVuZm9yZXN0U3dpdGNoQ2FzZSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIExpc3QoY2FzZXMpO1xuICB9XG5cbiAgZW5mb3Jlc3RTd2l0Y2hDYXNlKCkge1xuICAgIHRoaXMubWF0Y2hLZXl3b3JkKCdjYXNlJyk7XG4gICAgcmV0dXJuIG5ldyBULlN3aXRjaENhc2Uoe1xuICAgICAgdGVzdDogdGhpcy5lbmZvcmVzdEV4cHJlc3Npb24oKSxcbiAgICAgIGNvbnNlcXVlbnQ6IHRoaXMuZW5mb3Jlc3RTd2l0Y2hDYXNlQm9keSgpXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdFN3aXRjaENhc2VCb2R5KCkge1xuICAgIHRoaXMubWF0Y2hQdW5jdHVhdG9yKCc6Jyk7XG4gICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RTdGF0ZW1lbnRMaXN0SW5Td2l0Y2hDYXNlQm9keSgpO1xuICB9XG5cbiAgZW5mb3Jlc3RTdGF0ZW1lbnRMaXN0SW5Td2l0Y2hDYXNlQm9keSgpIHtcbiAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgd2hpbGUoISh0aGlzLnJlc3Quc2l6ZSA9PT0gMCB8fCB0aGlzLmlzS2V5d29yZCh0aGlzLnBlZWsoKSwgJ2RlZmF1bHQnKSB8fCB0aGlzLmlzS2V5d29yZCh0aGlzLnBlZWsoKSwgJ2Nhc2UnKSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHRoaXMuZW5mb3Jlc3RTdGF0ZW1lbnRMaXN0SXRlbSgpKTtcbiAgICB9XG4gICAgcmV0dXJuIExpc3QocmVzdWx0KTtcbiAgfVxuXG4gIGVuZm9yZXN0U3dpdGNoRGVmYXVsdCgpIHtcbiAgICB0aGlzLm1hdGNoS2V5d29yZCgnZGVmYXVsdCcpO1xuICAgIHJldHVybiBuZXcgVC5Td2l0Y2hEZWZhdWx0KHtcbiAgICAgIGNvbnNlcXVlbnQ6IHRoaXMuZW5mb3Jlc3RTd2l0Y2hDYXNlQm9keSgpXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdEZvclN0YXRlbWVudCgpIHtcbiAgICB0aGlzLm1hdGNoS2V5d29yZCgnZm9yJyk7XG4gICAgbGV0IGNvbmQgPSB0aGlzLm1hdGNoUGFyZW5zKCk7XG4gICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKGNvbmQsIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICBsZXQgbG9va2FoZWFkLCB0ZXN0LCBpbml0LCByaWdodCwgbGVmdCwgdXBkYXRlLCBjbnN0O1xuXG4gICAgLy8gY2FzZSB3aGVyZSBpbml0IGlzIG51bGxcbiAgICBpZiAoZW5mLmlzUHVuY3R1YXRvcihlbmYucGVlaygpLCAnOycpKSB7XG4gICAgICBlbmYuYWR2YW5jZSgpO1xuICAgICAgaWYgKCFlbmYuaXNQdW5jdHVhdG9yKGVuZi5wZWVrKCksICc7JykpIHtcbiAgICAgICAgdGVzdCA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb24oKTtcbiAgICAgIH1cbiAgICAgIGVuZi5tYXRjaFB1bmN0dWF0b3IoJzsnKTtcbiAgICAgIGlmIChlbmYucmVzdC5zaXplICE9PSAwKSB7XG4gICAgICAgIHJpZ2h0ID0gZW5mLmVuZm9yZXN0RXhwcmVzc2lvbigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBULkZvclN0YXRlbWVudCh7XG4gICAgICAgIGluaXQ6IG51bGwsXG4gICAgICAgIHRlc3Q6IHRlc3QsXG4gICAgICAgIHVwZGF0ZTogcmlnaHQsXG4gICAgICAgIGJvZHk6IHRoaXMuZW5mb3Jlc3RTdGF0ZW1lbnQoKVxuICAgICAgfSk7XG4gICAgLy8gY2FzZSB3aGVyZSBpbml0IGlzIG5vdCBudWxsXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHRlc3RpbmdcbiAgICAgIGxvb2thaGVhZCA9IGVuZi5wZWVrKCk7XG4gICAgICBpZiAoZW5mLmlzVmFyRGVjbFRyYW5zZm9ybShsb29rYWhlYWQpIHx8XG4gICAgICAgICAgZW5mLmlzTGV0RGVjbFRyYW5zZm9ybShsb29rYWhlYWQpIHx8XG4gICAgICAgICAgZW5mLmlzQ29uc3REZWNsVHJhbnNmb3JtKGxvb2thaGVhZCkpIHtcbiAgICAgICAgaW5pdCA9IGVuZi5lbmZvcmVzdFZhcmlhYmxlRGVjbGFyYXRpb24oKTtcbiAgICAgICAgbG9va2FoZWFkID0gZW5mLnBlZWsoKTtcbiAgICAgICAgaWYgKHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCwgJ2luJykgfHwgdGhpcy5pc0lkZW50aWZpZXIobG9va2FoZWFkLCAnb2YnKSkge1xuICAgICAgICAgIGlmICh0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsICdpbicpKSB7XG4gICAgICAgICAgICBlbmYuYWR2YW5jZSgpO1xuICAgICAgICAgICAgcmlnaHQgPSBlbmYuZW5mb3Jlc3RFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICBjbnN0ID0gVC5Gb3JJblN0YXRlbWVudDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXNzZXJ0KHRoaXMuaXNJZGVudGlmaWVyKGxvb2thaGVhZCwgJ29mJyksICdleHBlY3RpbmcgYG9mYCBrZXl3b3JkJyk7XG4gICAgICAgICAgICBlbmYuYWR2YW5jZSgpO1xuICAgICAgICAgICAgcmlnaHQgPSBlbmYuZW5mb3Jlc3RFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICBjbnN0ID0gVC5Gb3JPZlN0YXRlbWVudDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG5ldyBjbnN0KHtcbiAgICAgICAgICAgIGxlZnQ6IGluaXQsIHJpZ2h0LCBib2R5OiB0aGlzLmVuZm9yZXN0U3RhdGVtZW50KClcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbmYubWF0Y2hQdW5jdHVhdG9yKCc7Jyk7XG4gICAgICAgIGlmIChlbmYuaXNQdW5jdHVhdG9yKGVuZi5wZWVrKCksICc7JykpIHtcbiAgICAgICAgICBlbmYuYWR2YW5jZSgpO1xuICAgICAgICAgIHRlc3QgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRlc3QgPSBlbmYuZW5mb3Jlc3RFeHByZXNzaW9uKCk7XG4gICAgICAgICAgZW5mLm1hdGNoUHVuY3R1YXRvcignOycpO1xuICAgICAgICB9XG4gICAgICAgIHVwZGF0ZSA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb24oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLmlzS2V5d29yZChlbmYucGVlaygxKSwgJ2luJykgfHwgdGhpcy5pc0lkZW50aWZpZXIoZW5mLnBlZWsoMSksICdvZicpKSB7XG4gICAgICAgICAgbGVmdCA9IGVuZi5lbmZvcmVzdEJpbmRpbmdJZGVudGlmaWVyKCk7XG4gICAgICAgICAgbGV0IGtpbmQgPSBlbmYuYWR2YW5jZSgpO1xuICAgICAgICAgIGlmICh0aGlzLmlzS2V5d29yZChraW5kLCAnaW4nKSkge1xuICAgICAgICAgICAgY25zdCA9IFQuRm9ySW5TdGF0ZW1lbnQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNuc3QgPSBULkZvck9mU3RhdGVtZW50O1xuICAgICAgICAgIH1cbiAgICAgICAgICByaWdodCA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb24oKTtcbiAgICAgICAgICByZXR1cm4gbmV3IGNuc3Qoe1xuICAgICAgICAgICAgbGVmdDogbGVmdCwgcmlnaHQsIGJvZHk6IHRoaXMuZW5mb3Jlc3RTdGF0ZW1lbnQoKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGluaXQgPSBlbmYuZW5mb3Jlc3RFeHByZXNzaW9uKCk7XG4gICAgICAgIGVuZi5tYXRjaFB1bmN0dWF0b3IoJzsnKTtcbiAgICAgICAgaWYgKGVuZi5pc1B1bmN0dWF0b3IoZW5mLnBlZWsoKSwgJzsnKSkge1xuICAgICAgICAgIGVuZi5hZHZhbmNlKCk7XG4gICAgICAgICAgdGVzdCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGVzdCA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb24oKTtcbiAgICAgICAgICBlbmYubWF0Y2hQdW5jdHVhdG9yKCc7Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdXBkYXRlID0gZW5mLmVuZm9yZXN0RXhwcmVzc2lvbigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBULkZvclN0YXRlbWVudCh7IGluaXQsIHRlc3QsIHVwZGF0ZSwgYm9keTogdGhpcy5lbmZvcmVzdFN0YXRlbWVudCgpIH0pO1xuICAgIH1cbiAgfVxuXG4gIGVuZm9yZXN0SWZTdGF0ZW1lbnQoKSB7XG4gICAgdGhpcy5tYXRjaEtleXdvcmQoJ2lmJyk7XG4gICAgbGV0IGNvbmQgPSB0aGlzLm1hdGNoUGFyZW5zKCk7XG4gICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKGNvbmQsIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICBsZXQgbG9va2FoZWFkID0gZW5mLnBlZWsoKTtcbiAgICBsZXQgdGVzdCA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb24oKTtcbiAgICBpZiAodGVzdCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgZW5mLmNyZWF0ZUVycm9yKGxvb2thaGVhZCwgJ2V4cGVjdGluZyBhbiBleHByZXNzaW9uJyk7XG4gICAgfVxuICAgIGxldCBjb25zZXF1ZW50ID0gdGhpcy5lbmZvcmVzdFN0YXRlbWVudCgpO1xuICAgIGxldCBhbHRlcm5hdGUgPSBudWxsO1xuICAgIGlmICh0aGlzLmlzS2V5d29yZCh0aGlzLnBlZWsoKSwgJ2Vsc2UnKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICBhbHRlcm5hdGUgPSB0aGlzLmVuZm9yZXN0U3RhdGVtZW50KCk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgVC5JZlN0YXRlbWVudCh7IHRlc3QsIGNvbnNlcXVlbnQsIGFsdGVybmF0ZSB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0V2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgdGhpcy5tYXRjaEtleXdvcmQoJ3doaWxlJyk7XG4gICAgbGV0IGNvbmQgPSB0aGlzLm1hdGNoUGFyZW5zKCk7XG4gICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKGNvbmQsIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICBsZXQgbG9va2FoZWFkID0gZW5mLnBlZWsoKTtcbiAgICBsZXQgdGVzdCA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb24oKTtcbiAgICBpZiAodGVzdCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgZW5mLmNyZWF0ZUVycm9yKGxvb2thaGVhZCwgJ2V4cGVjdGluZyBhbiBleHByZXNzaW9uJyk7XG4gICAgfVxuICAgIGxldCBib2R5ID0gdGhpcy5lbmZvcmVzdFN0YXRlbWVudCgpO1xuXG4gICAgcmV0dXJuIG5ldyBULldoaWxlU3RhdGVtZW50KHsgdGVzdCwgYm9keSB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0QmxvY2tTdGF0ZW1lbnQoKSB7XG4gICAgcmV0dXJuIG5ldyBULkJsb2NrU3RhdGVtZW50KHtcbiAgICAgIGJsb2NrOiB0aGlzLmVuZm9yZXN0QmxvY2soKVxuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RCbG9jaygpIHtcbiAgICByZXR1cm4gbmV3IFQuQmxvY2soe1xuICAgICAgc3RhdGVtZW50czogdGhpcy5tYXRjaEN1cmxpZXMoKVxuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RDbGFzcyh7IGlzRXhwciA9IGZhbHNlLCBpbkRlZmF1bHQgPSBmYWxzZSB9OiB7aXNFeHByPzogYm9vbGVhbiwgaW5EZWZhdWx0PzogYm9vbGVhbn0pIHtcbiAgICBsZXQga3cgPSB0aGlzLm1hdGNoUmF3U3ludGF4KCk7XG4gICAgbGV0IG5hbWUgPSBudWxsLCBzdXByID0gbnVsbDtcblxuICAgIGlmICh0aGlzLmlzSWRlbnRpZmllcih0aGlzLnBlZWsoKSkpIHtcbiAgICAgIG5hbWUgPSB0aGlzLmVuZm9yZXN0QmluZGluZ0lkZW50aWZpZXIoKTtcbiAgICB9IGVsc2UgaWYgKCFpc0V4cHIpIHtcbiAgICAgIGlmIChpbkRlZmF1bHQpIHtcbiAgICAgICAgbmFtZSA9IG5ldyBULkJpbmRpbmdJZGVudGlmaWVyKHtcbiAgICAgICAgICBuYW1lOiBTeW50YXguZnJvbUlkZW50aWZpZXIoJ19kZWZhdWx0Jywga3cpXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcih0aGlzLnBlZWsoKSwgJ3VuZXhwZWN0ZWQgc3ludGF4Jyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaXNLZXl3b3JkKHRoaXMucGVlaygpLCAnZXh0ZW5kcycpKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIHN1cHIgPSB0aGlzLmVuZm9yZXN0RXhwcmVzc2lvbkxvb3AoKTtcbiAgICB9XG5cbiAgICBsZXQgZWxlbWVudHMgPSBbXTtcbiAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIodGhpcy5tYXRjaEN1cmxpZXMoKSwgTGlzdCgpLCB0aGlzLmNvbnRleHQpO1xuICAgIHdoaWxlIChlbmYucmVzdC5zaXplICE9PSAwKSB7XG4gICAgICBpZiAoZW5mLmlzUHVuY3R1YXRvcihlbmYucGVlaygpLCAnOycpKSB7XG4gICAgICAgIGVuZi5hZHZhbmNlKCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBsZXQgaXNTdGF0aWMgPSBmYWxzZTtcbiAgICAgIGxldCB7bWV0aG9kT3JLZXksIGtpbmR9ID0gZW5mLmVuZm9yZXN0TWV0aG9kRGVmaW5pdGlvbigpO1xuICAgICAgaWYgKGtpbmQgPT09ICdpZGVudGlmaWVyJyAmJiBtZXRob2RPcktleS52YWx1ZS52YWwoKSA9PT0gJ3N0YXRpYycpIHtcbiAgICAgICAgaXNTdGF0aWMgPSB0cnVlO1xuICAgICAgICAoe21ldGhvZE9yS2V5LCBraW5kfSA9IGVuZi5lbmZvcmVzdE1ldGhvZERlZmluaXRpb24oKSk7XG4gICAgICB9XG4gICAgICBpZiAoa2luZCA9PT0gJ21ldGhvZCcpIHtcbiAgICAgICAgZWxlbWVudHMucHVzaChuZXcgVC5DbGFzc0VsZW1lbnQoe2lzU3RhdGljLCBtZXRob2Q6IG1ldGhvZE9yS2V5fSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihlbmYucGVlaygpLCAnT25seSBtZXRob2RzIGFyZSBhbGxvd2VkIGluIGNsYXNzZXMnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyAoaXNFeHByID8gVC5DbGFzc0V4cHJlc3Npb24gOiBULkNsYXNzRGVjbGFyYXRpb24pKHtcbiAgICAgIG5hbWUsIHN1cGVyOiBzdXByLFxuICAgICAgZWxlbWVudHM6IExpc3QoZWxlbWVudHMpXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdEJpbmRpbmdUYXJnZXQoeyBhbGxvd1B1bmN0dWF0b3IgPSBmYWxzZSB9OiB7YWxsb3dQdW5jdHVhdG9yPzogYm9vbGVhbn0gPSB7fSkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAodGhpcy5pc0lkZW50aWZpZXIobG9va2FoZWFkKSB8fCB0aGlzLmlzS2V5d29yZChsb29rYWhlYWQpIHx8IChhbGxvd1B1bmN0dWF0b3IgJiYgdGhpcy5pc1B1bmN0dWF0b3IobG9va2FoZWFkKSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0QmluZGluZ0lkZW50aWZpZXIoeyBhbGxvd1B1bmN0dWF0b3IgfSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzQnJhY2tldHMobG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RBcnJheUJpbmRpbmcoKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNCcmFjZXMobG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RPYmplY3RCaW5kaW5nKCk7XG4gICAgfVxuICAgIGFzc2VydChmYWxzZSwgJ25vdCBpbXBsZW1lbnRlZCB5ZXQnKTtcbiAgfVxuXG4gIGVuZm9yZXN0T2JqZWN0QmluZGluZygpIHtcbiAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIodGhpcy5tYXRjaEN1cmxpZXMoKSwgTGlzdCgpLCB0aGlzLmNvbnRleHQpO1xuICAgIGxldCBwcm9wZXJ0aWVzID0gW107XG4gICAgd2hpbGUgKGVuZi5yZXN0LnNpemUgIT09IDApIHtcbiAgICAgIHByb3BlcnRpZXMucHVzaChlbmYuZW5mb3Jlc3RCaW5kaW5nUHJvcGVydHkoKSk7XG4gICAgICBlbmYuY29uc3VtZUNvbW1hKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBULk9iamVjdEJpbmRpbmcoe1xuICAgICAgcHJvcGVydGllczogTGlzdChwcm9wZXJ0aWVzKVxuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RCaW5kaW5nUHJvcGVydHkoKSB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgIGxldCB7bmFtZSwgYmluZGluZ30gPSB0aGlzLmVuZm9yZXN0UHJvcGVydHlOYW1lKCk7XG4gICAgaWYgKHRoaXMuaXNJZGVudGlmaWVyKGxvb2thaGVhZCkgfHwgdGhpcy5pc0tleXdvcmQobG9va2FoZWFkLCAnbGV0JykgfHwgdGhpcy5pc0tleXdvcmQobG9va2FoZWFkLCAneWllbGQnKSkge1xuICAgICAgaWYgKCF0aGlzLmlzUHVuY3R1YXRvcih0aGlzLnBlZWsoKSwgJzonKSkge1xuICAgICAgICBsZXQgZGVmYXVsdFZhbHVlID0gbnVsbDtcbiAgICAgICAgaWYgKHRoaXMuaXNBc3NpZ24odGhpcy5wZWVrKCkpKSB7XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICAgICAgbGV0IGV4cHIgPSB0aGlzLmVuZm9yZXN0RXhwcmVzc2lvbkxvb3AoKTtcbiAgICAgICAgICBkZWZhdWx0VmFsdWUgPSBleHByO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgVC5CaW5kaW5nUHJvcGVydHlJZGVudGlmaWVyKHtcbiAgICAgICAgICBiaW5kaW5nLCBpbml0OiBkZWZhdWx0VmFsdWVcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMubWF0Y2hQdW5jdHVhdG9yKCc6Jyk7XG4gICAgYmluZGluZyA9IHRoaXMuZW5mb3Jlc3RCaW5kaW5nRWxlbWVudCgpO1xuICAgIHJldHVybiBuZXcgVC5CaW5kaW5nUHJvcGVydHlQcm9wZXJ0eSh7XG4gICAgICBuYW1lLCBiaW5kaW5nXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdEFycmF5QmluZGluZygpIHtcbiAgICBsZXQgYnJhY2tldCA9IHRoaXMubWF0Y2hTcXVhcmVzKCk7XG4gICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKGJyYWNrZXQsIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICBsZXQgZWxlbWVudHMgPSBbXSwgcmVzdEVsZW1lbnQgPSBudWxsO1xuICAgIHdoaWxlIChlbmYucmVzdC5zaXplICE9PSAwKSB7XG4gICAgICBsZXQgZWw7XG4gICAgICBpZiAoZW5mLmlzUHVuY3R1YXRvcihlbmYucGVlaygpLCAnLCcpKSB7XG4gICAgICAgIGVuZi5jb25zdW1lQ29tbWEoKTtcbiAgICAgICAgZWwgPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGVuZi5pc1B1bmN0dWF0b3IoZW5mLnBlZWsoKSwgJy4uLicpKSB7XG4gICAgICAgICAgZW5mLmFkdmFuY2UoKTtcbiAgICAgICAgICByZXN0RWxlbWVudCA9IGVuZi5lbmZvcmVzdEJpbmRpbmdUYXJnZXQoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbCA9IGVuZi5lbmZvcmVzdEJpbmRpbmdFbGVtZW50KCk7XG4gICAgICAgIH1cbiAgICAgICAgZW5mLmNvbnN1bWVDb21tYSgpO1xuICAgICAgfVxuICAgICAgZWxlbWVudHMucHVzaChlbCk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgVC5BcnJheUJpbmRpbmcoe1xuICAgICAgZWxlbWVudHM6IExpc3QoZWxlbWVudHMpLFxuICAgICAgcmVzdEVsZW1lbnRcbiAgICB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0QmluZGluZ0VsZW1lbnQoKSB7XG4gICAgbGV0IGJpbmRpbmcgPSB0aGlzLmVuZm9yZXN0QmluZGluZ1RhcmdldCgpO1xuXG4gICAgaWYgKHRoaXMuaXNBc3NpZ24odGhpcy5wZWVrKCkpKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIGxldCBpbml0ID0gdGhpcy5lbmZvcmVzdEV4cHJlc3Npb25Mb29wKCk7XG4gICAgICBiaW5kaW5nID0gbmV3IFQuQmluZGluZ1dpdGhEZWZhdWx0KHsgYmluZGluZywgaW5pdCB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGJpbmRpbmc7XG4gIH1cblxuICBlbmZvcmVzdEJpbmRpbmdJZGVudGlmaWVyKHsgYWxsb3dQdW5jdHVhdG9yIH06IHsgYWxsb3dQdW5jdHVhdG9yPzogYm9vbGVhbiB9ID0ge30pIHtcbiAgICBsZXQgbmFtZTtcbiAgICBpZiAoYWxsb3dQdW5jdHVhdG9yICYmIHRoaXMuaXNQdW5jdHVhdG9yKHRoaXMucGVlaygpKSkge1xuICAgICAgbmFtZSA9IHRoaXMuZW5mb3Jlc3RQdW5jdHVhdG9yKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSB0aGlzLmVuZm9yZXN0SWRlbnRpZmllcigpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFQuQmluZGluZ0lkZW50aWZpZXIoeyBuYW1lIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RQdW5jdHVhdG9yKCkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAodGhpcy5pc1B1bmN0dWF0b3IobG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMubWF0Y2hSYXdTeW50YXgoKTtcbiAgICB9XG4gICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihsb29rYWhlYWQsICdleHBlY3RpbmcgYSBwdW5jdHVhdG9yJyk7XG4gIH1cblxuICBlbmZvcmVzdElkZW50aWZpZXIoKSB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgIGlmICh0aGlzLmlzSWRlbnRpZmllcihsb29rYWhlYWQpIHx8IHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hdGNoUmF3U3ludGF4KCk7XG4gICAgfVxuICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IobG9va2FoZWFkLCAnZXhwZWN0aW5nIGFuIGlkZW50aWZpZXInKTtcbiAgfVxuXG5cbiAgZW5mb3Jlc3RSZXR1cm5TdGF0ZW1lbnQoKSB7XG4gICAgbGV0IGt3ID0gdGhpcy5tYXRjaFJhd1N5bnRheCgpO1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcblxuICAgIC8vIHNob3J0IGNpcmN1aXQgZm9yIHRoZSBlbXB0eSBleHByZXNzaW9uIGNhc2VcbiAgICBpZiAodGhpcy5yZXN0LnNpemUgPT09IDAgfHxcbiAgICAgICAgKGxvb2thaGVhZCAmJiAhdGhpcy5saW5lTnVtYmVyRXEoa3csIGxvb2thaGVhZCkpKSB7XG4gICAgICByZXR1cm4gbmV3IFQuUmV0dXJuU3RhdGVtZW50KHtcbiAgICAgICAgZXhwcmVzc2lvbjogbnVsbFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgbGV0IHRlcm0gPSBudWxsO1xuICAgIGlmICghdGhpcy5pc1B1bmN0dWF0b3IobG9va2FoZWFkLCAnOycpKSB7XG4gICAgICB0ZXJtID0gdGhpcy5lbmZvcmVzdEV4cHJlc3Npb24oKTtcbiAgICAgIGV4cGVjdCh0ZXJtICE9IG51bGwsICdFeHBlY3RpbmcgYW4gZXhwcmVzc2lvbiB0byBmb2xsb3cgcmV0dXJuIGtleXdvcmQnLCBsb29rYWhlYWQsIHRoaXMucmVzdCk7XG4gICAgfVxuXG4gICAgdGhpcy5jb25zdW1lU2VtaWNvbG9uKCk7XG4gICAgcmV0dXJuIG5ldyBULlJldHVyblN0YXRlbWVudCh7XG4gICAgICBleHByZXNzaW9uOiB0ZXJtXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdFZhcmlhYmxlRGVjbGFyYXRpb24oKSB7XG4gICAgbGV0IGtpbmQ7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMubWF0Y2hSYXdTeW50YXgoKTtcbiAgICBsZXQga2luZFN5biA9IGxvb2thaGVhZDtcbiAgICBsZXQgcGhhc2UgPSB0aGlzLmNvbnRleHQucGhhc2U7XG5cbiAgICBpZiAoa2luZFN5biAmJlxuICAgICAgICB0aGlzLmNvbnRleHQuZW52LmdldChraW5kU3luLnJlc29sdmUocGhhc2UpKSA9PT0gVmFyaWFibGVEZWNsVHJhbnNmb3JtKSB7XG4gICAgICBraW5kID0gJ3Zhcic7XG4gICAgfSBlbHNlIGlmIChraW5kU3luICYmXG4gICAgICAgICAgICAgICB0aGlzLmNvbnRleHQuZW52LmdldChraW5kU3luLnJlc29sdmUocGhhc2UpKSA9PT0gTGV0RGVjbFRyYW5zZm9ybSkge1xuICAgICAga2luZCA9ICdsZXQnO1xuICAgIH0gZWxzZSBpZiAoa2luZFN5biAmJlxuICAgICAgICAgICAgICAgdGhpcy5jb250ZXh0LmVudi5nZXQoa2luZFN5bi5yZXNvbHZlKHBoYXNlKSkgPT09IENvbnN0RGVjbFRyYW5zZm9ybSkge1xuICAgICAga2luZCA9ICdjb25zdCc7XG4gICAgfSBlbHNlIGlmIChraW5kU3luICYmXG4gICAgICAgICAgICAgICB0aGlzLmNvbnRleHQuZW52LmdldChraW5kU3luLnJlc29sdmUocGhhc2UpKSA9PT0gU3ludGF4RGVjbFRyYW5zZm9ybSkge1xuICAgICAga2luZCA9ICdzeW50YXgnO1xuICAgIH0gZWxzZSBpZiAoa2luZFN5biAmJlxuICAgICAgICAgICAgICAgdGhpcy5jb250ZXh0LmVudi5nZXQoa2luZFN5bi5yZXNvbHZlKHBoYXNlKSkgPT09IFN5bnRheHJlY0RlY2xUcmFuc2Zvcm0pIHtcbiAgICAgIGtpbmQgPSAnc3ludGF4cmVjJztcbiAgICB9XG5cbiAgICBsZXQgZGVjbHMgPSBMaXN0KCk7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgbGV0IHRlcm0gPSB0aGlzLmVuZm9yZXN0VmFyaWFibGVEZWNsYXJhdG9yKHsgaXNTeW50YXg6IGtpbmQgPT09ICdzeW50YXgnIHx8IGtpbmQgPT09ICdzeW50YXhyZWMnIH0pO1xuICAgICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgICAgZGVjbHMgPSBkZWNscy5jb25jYXQodGVybSk7XG5cbiAgICAgIGlmICh0aGlzLmlzUHVuY3R1YXRvcihsb29rYWhlYWQsICcsJykpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFQuVmFyaWFibGVEZWNsYXJhdGlvbih7XG4gICAgICBraW5kOiBraW5kLFxuICAgICAgZGVjbGFyYXRvcnM6IGRlY2xzXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdFZhcmlhYmxlRGVjbGFyYXRvcih7IGlzU3ludGF4IH06IHsgaXNTeW50YXg6IGJvb2xlYW59KSB7XG4gICAgbGV0IGlkID0gdGhpcy5lbmZvcmVzdEJpbmRpbmdUYXJnZXQoeyBhbGxvd1B1bmN0dWF0b3I6IGlzU3ludGF4IH0pO1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcblxuICAgIGxldCBpbml0O1xuICAgIGlmICh0aGlzLmlzUHVuY3R1YXRvcihsb29rYWhlYWQsICc9JykpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKHRoaXMucmVzdCwgTGlzdCgpLCB0aGlzLmNvbnRleHQpO1xuICAgICAgaW5pdCA9IGVuZi5lbmZvcmVzdCgnZXhwcmVzc2lvbicpO1xuICAgICAgdGhpcy5yZXN0ID0gZW5mLnJlc3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIGluaXQgPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFQuVmFyaWFibGVEZWNsYXJhdG9yKHtcbiAgICAgIGJpbmRpbmc6IGlkLFxuICAgICAgaW5pdDogaW5pdFxuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RFeHByZXNzaW9uU3RhdGVtZW50KCkge1xuICAgIGxldCBzdGFydCA9IHRoaXMucmVzdC5nZXQoMCk7XG4gICAgbGV0IGV4cHIgPSB0aGlzLmVuZm9yZXN0RXhwcmVzc2lvbigpO1xuICAgIGlmIChleHByID09PSBudWxsKSB7XG4gICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKHN0YXJ0LCAnbm90IGEgdmFsaWQgZXhwcmVzc2lvbicpO1xuICAgIH1cbiAgICB0aGlzLmNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgIHJldHVybiBuZXcgVC5FeHByZXNzaW9uU3RhdGVtZW50KHtcbiAgICAgIGV4cHJlc3Npb246IGV4cHJcbiAgICB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0RXhwcmVzc2lvbigpIHtcbiAgICBsZXQgbGVmdCA9IHRoaXMuZW5mb3Jlc3RFeHByZXNzaW9uTG9vcCgpO1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAodGhpcy5pc1B1bmN0dWF0b3IobG9va2FoZWFkLCAnLCcpKSB7XG4gICAgICB3aGlsZSAodGhpcy5yZXN0LnNpemUgIT09IDApIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzUHVuY3R1YXRvcih0aGlzLnBlZWsoKSwgJywnKSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGxldCBvcGVyYXRvciA9IHRoaXMubWF0Y2hSYXdTeW50YXgoKTtcbiAgICAgICAgbGV0IHJpZ2h0ID0gdGhpcy5lbmZvcmVzdEV4cHJlc3Npb25Mb29wKCk7XG4gICAgICAgIGxlZnQgPSBuZXcgVC5CaW5hcnlFeHByZXNzaW9uKHtsZWZ0LCBvcGVyYXRvcjogb3BlcmF0b3IudmFsKCksIHJpZ2h0fSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMudGVybSA9IG51bGw7XG4gICAgcmV0dXJuIGxlZnQ7XG4gIH1cblxuICBlbmZvcmVzdEV4cHJlc3Npb25Mb29wKCkge1xuICAgIHRoaXMudGVybSA9IG51bGw7XG4gICAgdGhpcy5vcEN0eCA9IHtcbiAgICAgIHByZWM6IDAsXG4gICAgICBjb21iaW5lOiAoeCkgPT4geCxcbiAgICAgIHN0YWNrOiBMaXN0KClcbiAgICB9O1xuXG4gICAgZG8ge1xuICAgICAgbGV0IHRlcm0gPSB0aGlzLmVuZm9yZXN0QXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICAgIC8vIG5vIGNoYW5nZSBtZWFucyB3ZSd2ZSBkb25lIGFzIG11Y2ggZW5mb3Jlc3RpbmcgYXMgcG9zc2libGVcbiAgICAgIC8vIGlmIG5vdGhpbmcgY2hhbmdlZCwgbWF5YmUgd2UganVzdCBuZWVkIHRvIHBvcCB0aGUgZXhwciBzdGFja1xuICAgICAgaWYgKHRlcm0gPT09IEVYUFJfTE9PUF9OT19DSEFOR0UgJiYgdGhpcy5vcEN0eC5zdGFjay5zaXplID4gMCkge1xuICAgICAgICB0aGlzLnRlcm0gPSB0aGlzLm9wQ3R4LmNvbWJpbmUodGhpcy50ZXJtKTtcbiAgICAgICAgbGV0IHtwcmVjLCBjb21iaW5lfSA9IHRoaXMub3BDdHguc3RhY2subGFzdCgpO1xuICAgICAgICB0aGlzLm9wQ3R4LnByZWMgPSBwcmVjO1xuICAgICAgICB0aGlzLm9wQ3R4LmNvbWJpbmUgPSBjb21iaW5lO1xuICAgICAgICB0aGlzLm9wQ3R4LnN0YWNrID0gdGhpcy5vcEN0eC5zdGFjay5wb3AoKTtcbiAgICAgIH0gZWxzZSBpZiAodGVybSA9PT0gRVhQUl9MT09QX05PX0NIQU5HRSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH0gZWxzZSBpZiAodGVybSA9PT0gRVhQUl9MT09QX09QRVJBVE9SIHx8IHRlcm0gPT09IEVYUFJfTE9PUF9FWFBBTlNJT04pIHtcbiAgICAgICAgLy8gb3BlcmF0b3IgbWVhbnMgYW4gb3BDdHggd2FzIHB1c2hlZCBvbiB0aGUgc3RhY2tcbiAgICAgICAgdGhpcy50ZXJtID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudGVybSA9IHRlcm07XG4gICAgICB9XG4gICAgfSB3aGlsZSAodHJ1ZSk7ICAvLyBnZXQgYSBmaXhwb2ludFxuICAgIHJldHVybiB0aGlzLnRlcm07XG4gIH1cblxuICBlbmZvcmVzdEFzc2lnbm1lbnRFeHByZXNzaW9uKCkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcblxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc01vZHVsZU5hbWVzcGFjZVRyYW5zZm9ybShsb29rYWhlYWQpKSB7XG4gICAgICAvLyAkRmxvd0ZpeE1lOiB3ZSBuZWVkIHRvIHJlZmFjdG9yIHRoZSBlbmZvcmVzdGVyIHRvIG1ha2UgZmxvdyB3b3JrIGJldHRlclxuICAgICAgbGV0IG5hbWVzcGFjZSA9IHRoaXMuZ2V0RnJvbUNvbXBpbGV0aW1lRW52aXJvbm1lbnQodGhpcy5hZHZhbmNlKCkudmFsdWUpO1xuICAgICAgdGhpcy5tYXRjaFB1bmN0dWF0b3IoJy4nKTtcbiAgICAgIGxldCBuYW1lID0gdGhpcy5tYXRjaElkZW50aWZpZXIoKTtcbiAgICAgIC8vICRGbG93Rml4TWU6IHdlIG5lZWQgdG8gcmVmYWN0b3IgdGhlIGVuZm9yZXN0ZXIgdG8gbWFrZSBmbG93IHdvcmsgYmV0dGVyXG4gICAgICBsZXQgZXhwb3J0ZWROYW1lID0gbmFtZXNwYWNlLm1vZC5leHBvcnRlZE5hbWVzLmZpbmQoZXhOYW1lID0+IGV4TmFtZS5leHBvcnRlZE5hbWUudmFsKCkgPT09IG5hbWUudmFsKCkpO1xuICAgICAgdGhpcy5yZXN0ID0gdGhpcy5yZXN0LnVuc2hpZnQobmV3IFQuUmF3U3ludGF4KHtcbiAgICAgICAgdmFsdWU6IFN5bnRheC5mcm9tSWRlbnRpZmllcihuYW1lLnZhbCgpLCBleHBvcnRlZE5hbWUuZXhwb3J0ZWROYW1lKVxuICAgICAgfSkpO1xuICAgICAgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiB0aGlzLmlzQ29tcGlsZXRpbWVUcmFuc2Zvcm0obG9va2FoZWFkKSkge1xuICAgICAgdGhpcy5leHBhbmRNYWNybygpO1xuICAgICAgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiB0aGlzLmlzVGVybShsb29rYWhlYWQpICYmIGxvb2thaGVhZCBpbnN0YW5jZW9mIFQuRXhwcmVzc2lvbikge1xuICAgICAgLy8gVE9ETzogY2hlY2sgdGhhdCB0aGlzIGlzIGFjdHVhbGx5IGFuIGV4cHJlc3Npb25cbiAgICAgIHJldHVybiB0aGlzLmFkdmFuY2UoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCwgJ3lpZWxkJykpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0WWllbGRFeHByZXNzaW9uKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiB0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsICdjbGFzcycpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdENsYXNzKHtpc0V4cHI6IHRydWV9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIGxvb2thaGVhZCAmJlxuICAgICAgKHRoaXMuaXNJZGVudGlmaWVyKGxvb2thaGVhZCkgfHwgdGhpcy5pc1BhcmVucyhsb29rYWhlYWQpKSAmJlxuICAgICAgIHRoaXMuaXNQdW5jdHVhdG9yKHRoaXMucGVlaygxKSwgJz0+JykgJiZcbiAgICAgICB0aGlzLmxpbmVOdW1iZXJFcShsb29rYWhlYWQsIHRoaXMucGVlaygxKSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0QXJyb3dFeHByZXNzaW9uKCk7XG4gICAgfVxuXG5cblxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc1N5bnRheFRlbXBsYXRlKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0U3ludGF4VGVtcGxhdGUoKTtcbiAgICB9XG5cbiAgICAvLyAoJHg6ZXhwcilcbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNQYXJlbnMobG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIG5ldyBULlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uKHtcbiAgICAgICAgaW5uZXI6IHRoaXMubWF0Y2hQYXJlbnMoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiAoXG4gICAgICB0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsICd0aGlzJykgfHxcbiAgICAgIHRoaXMuaXNJZGVudGlmaWVyKGxvb2thaGVhZCkgfHxcbiAgICAgIHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCwgJ2xldCcpIHx8XG4gICAgICB0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsICd5aWVsZCcpIHx8XG4gICAgICB0aGlzLmlzTnVtZXJpY0xpdGVyYWwobG9va2FoZWFkKSB8fFxuICAgICAgdGhpcy5pc1N0cmluZ0xpdGVyYWwobG9va2FoZWFkKSB8fFxuICAgICAgdGhpcy5pc1RlbXBsYXRlKGxvb2thaGVhZCkgfHxcbiAgICAgIHRoaXMuaXNCb29sZWFuTGl0ZXJhbChsb29rYWhlYWQpIHx8XG4gICAgICB0aGlzLmlzTnVsbExpdGVyYWwobG9va2FoZWFkKSB8fFxuICAgICAgdGhpcy5pc1JlZ3VsYXJFeHByZXNzaW9uKGxvb2thaGVhZCkgfHxcbiAgICAgIHRoaXMuaXNGbkRlY2xUcmFuc2Zvcm0obG9va2FoZWFkKSB8fFxuICAgICAgdGhpcy5pc0JyYWNlcyhsb29rYWhlYWQpIHx8XG4gICAgICB0aGlzLmlzQnJhY2tldHMobG9va2FoZWFkKSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0UHJpbWFyeUV4cHJlc3Npb24oKTtcbiAgICB9XG5cbiAgICAvLyBwcmVmaXggdW5hcnlcbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNPcGVyYXRvcihsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdFVuYXJ5RXhwcmVzc2lvbigpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc1ZhckJpbmRpbmdUcmFuc2Zvcm0obG9va2FoZWFkKSAmJiBsb29rYWhlYWQgaW5zdGFuY2VvZiBULlJhd1N5bnRheCkge1xuICAgICAgbGV0IGxvb2tzdHggPSBsb29rYWhlYWQudmFsdWU7XG4gICAgICAvLyAkRmxvd0ZpeE1lXG4gICAgICBsZXQgaWQgPSB0aGlzLmdldEZyb21Db21waWxldGltZUVudmlyb25tZW50KGxvb2tzdHgpLmlkO1xuICAgICAgaWYgKGlkICE9PSBsb29rc3R4KSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICB0aGlzLnJlc3QgPSBMaXN0Lm9mKGlkKS5jb25jYXQodGhpcy5yZXN0KTtcbiAgICAgICAgcmV0dXJuIEVYUFJfTE9PUF9FWFBBTlNJT047XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCh0aGlzLnRlcm0gPT09IG51bGwgJiYgKFxuICAgICAgdGhpcy5pc05ld1RyYW5zZm9ybShsb29rYWhlYWQpIHx8XG4gICAgICAgIHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCwgJ3N1cGVyJykpKSB8fFxuICAgICAgICAvLyBhbmQgdGhlbiBjaGVjayB0aGUgY2FzZXMgd2hlcmUgdGhlIHRlcm0gcGFydCBvZiBwIGlzIHNvbWV0aGluZy4uLlxuICAgICAgICAodGhpcy50ZXJtICYmIChcbiAgICAgICAgICAvLyAkeDpleHByIC4gJHByb3A6aWRlbnRcbiAgICAgICAgICAodGhpcy5pc1B1bmN0dWF0b3IobG9va2FoZWFkLCAnLicpICYmIChcbiAgICAgICAgICAgIHRoaXMuaXNJZGVudGlmaWVyKHRoaXMucGVlaygxKSkgfHwgdGhpcy5pc0tleXdvcmQodGhpcy5wZWVrKDEpKSkpIHx8XG4gICAgICAgICAgICAvLyAkeDpleHByIFsgJGI6ZXhwciBdXG4gICAgICAgICAgICB0aGlzLmlzQnJhY2tldHMobG9va2FoZWFkKSB8fFxuICAgICAgICAgICAgLy8gJHg6ZXhwciAoLi4uKVxuICAgICAgICAgICAgdGhpcy5pc1BhcmVucyhsb29rYWhlYWQpXG4gICAgICAgICkpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdExlZnRIYW5kU2lkZUV4cHJlc3Npb24oeyBhbGxvd0NhbGw6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLy8gJHg6aWQgYC4uLmBcbiAgICBpZih0aGlzLnRlcm0gJiYgdGhpcy5pc1RlbXBsYXRlKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0VGVtcGxhdGVMaXRlcmFsKCk7XG4gICAgfVxuXG4gICAgLy8gcG9zdGZpeCB1bmFyeVxuICAgIGlmICh0aGlzLnRlcm0gJiYgdGhpcy5pc1VwZGF0ZU9wZXJhdG9yKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0VXBkYXRlRXhwcmVzc2lvbigpO1xuICAgIH1cblxuICAgIC8vICRsOmV4cHIgJG9wOmJpbmFyeU9wZXJhdG9yICRyOmV4cHJcbiAgICBpZiAodGhpcy50ZXJtICYmIHRoaXMuaXNPcGVyYXRvcihsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdEJpbmFyeUV4cHJlc3Npb24oKTtcbiAgICB9XG5cbiAgICAvLyAkeDpleHByID0gJGluaXQ6ZXhwclxuICAgIGlmICh0aGlzLnRlcm0gJiYgdGhpcy5pc0Fzc2lnbihsb29rYWhlYWQpKSB7XG4gICAgICBsZXQgYmluZGluZyA9IHRoaXMudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZyh0aGlzLnRlcm0pO1xuICAgICAgbGV0IG9wID0gdGhpcy5tYXRjaFJhd1N5bnRheCgpO1xuXG4gICAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIodGhpcy5yZXN0LCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG4gICAgICBsZXQgaW5pdCA9IGVuZi5lbmZvcmVzdCgnZXhwcmVzc2lvbicpO1xuICAgICAgdGhpcy5yZXN0ID0gZW5mLnJlc3Q7XG5cbiAgICAgIGlmIChvcC52YWwoKSA9PT0gJz0nKSB7XG4gICAgICAgIHJldHVybiBuZXcgVC5Bc3NpZ25tZW50RXhwcmVzc2lvbih7XG4gICAgICAgICAgYmluZGluZyxcbiAgICAgICAgICBleHByZXNzaW9uOiBpbml0XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBULkNvbXBvdW5kQXNzaWdubWVudEV4cHJlc3Npb24oe1xuICAgICAgICAgIGJpbmRpbmcsXG4gICAgICAgICAgb3BlcmF0b3I6IG9wLnZhbCgpLFxuICAgICAgICAgIGV4cHJlc3Npb246IGluaXRcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVybSAmJiB0aGlzLmlzUHVuY3R1YXRvcihsb29rYWhlYWQsICc/JykpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0Q29uZGl0aW9uYWxFeHByZXNzaW9uKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEVYUFJfTE9PUF9OT19DSEFOR0U7XG4gIH1cblxuICBlbmZvcmVzdFByaW1hcnlFeHByZXNzaW9uKCkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcbiAgICAvLyAkeDpUaGlzRXhwcmVzc2lvblxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc0tleXdvcmQobG9va2FoZWFkLCAndGhpcycpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdFRoaXNFeHByZXNzaW9uKCk7XG4gICAgfVxuICAgIC8vICR4OmlkZW50XG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiAodGhpcy5pc0lkZW50aWZpZXIobG9va2FoZWFkKSB8fCB0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsICdsZXQnKSB8fCB0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsICd5aWVsZCcpKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RJZGVudGlmaWVyRXhwcmVzc2lvbigpO1xuICAgIH1cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNOdW1lcmljTGl0ZXJhbChsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdE51bWVyaWNMaXRlcmFsKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc1N0cmluZ0xpdGVyYWwobG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RTdHJpbmdMaXRlcmFsKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc1RlbXBsYXRlKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0VGVtcGxhdGVMaXRlcmFsKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnRlcm0gPT09IG51bGwgJiYgdGhpcy5pc0Jvb2xlYW5MaXRlcmFsKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVuZm9yZXN0Qm9vbGVhbkxpdGVyYWwoKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiB0aGlzLmlzTnVsbExpdGVyYWwobG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3ROdWxsTGl0ZXJhbCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNSZWd1bGFyRXhwcmVzc2lvbihsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbmZvcmVzdFJlZ3VsYXJFeHByZXNzaW9uTGl0ZXJhbCgpO1xuICAgIH1cbiAgICAvLyAkeDpGdW5jdGlvbkV4cHJlc3Npb25cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNGbkRlY2xUcmFuc2Zvcm0obG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RGdW5jdGlvbih7aXNFeHByOiB0cnVlfSk7XG4gICAgfVxuICAgIC8vIHsgJHA6cHJvcCAoLCkgLi4uIH1cbiAgICBpZiAodGhpcy50ZXJtID09PSBudWxsICYmIHRoaXMuaXNCcmFjZXMobG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RPYmplY3RFeHByZXNzaW9uKCk7XG4gICAgfVxuICAgIC8vIFskeDpleHByICgsKSAuLi5dXG4gICAgaWYgKHRoaXMudGVybSA9PT0gbnVsbCAmJiB0aGlzLmlzQnJhY2tldHMobG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RBcnJheUV4cHJlc3Npb24oKTtcbiAgICB9XG4gICAgYXNzZXJ0KGZhbHNlLCAnTm90IGEgcHJpbWFyeSBleHByZXNzaW9uJyk7XG4gIH1cblxuICBlbmZvcmVzdExlZnRIYW5kU2lkZUV4cHJlc3Npb24oeyBhbGxvd0NhbGwgfTogeyBhbGxvd0NhbGw6IGJvb2xlYW4gfSkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcblxuICAgIGlmICh0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsICdzdXBlcicpKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIHRoaXMudGVybSA9IG5ldyBULlN1cGVyKHt9KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNOZXdUcmFuc2Zvcm0obG9va2FoZWFkKSkge1xuICAgICAgdGhpcy50ZXJtID0gdGhpcy5lbmZvcmVzdE5ld0V4cHJlc3Npb24oKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCwgJ3RoaXMnKSkge1xuICAgICAgdGhpcy50ZXJtID0gdGhpcy5lbmZvcmVzdFRoaXNFeHByZXNzaW9uKCk7XG4gICAgfVxuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgICAgaWYgKHRoaXMuaXNQYXJlbnMobG9va2FoZWFkKSkge1xuICAgICAgICBpZiAoIWFsbG93Q2FsbCkge1xuICAgICAgICAgIC8vIHdlJ3JlIGRlYWxpbmcgd2l0aCBhIG5ldyBleHByZXNzaW9uXG4gICAgICAgICAgaWYgKHRoaXMudGVybSAmJlxuICAgICAgICAgICAgICAoaXNJZGVudGlmaWVyRXhwcmVzc2lvbih0aGlzLnRlcm0pIHx8XG4gICAgICAgICAgICAgICBpc1N0YXRpY01lbWJlckV4cHJlc3Npb24odGhpcy50ZXJtKSB8fFxuICAgICAgICAgICAgICAgaXNDb21wdXRlZE1lbWJlckV4cHJlc3Npb24odGhpcy50ZXJtKSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRlcm07XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMudGVybSA9IHRoaXMuZW5mb3Jlc3RFeHByZXNzaW9uTG9vcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudGVybSA9IHRoaXMuZW5mb3Jlc3RDYWxsRXhwcmVzc2lvbigpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuaXNCcmFja2V0cyhsb29rYWhlYWQpKSB7XG4gICAgICAgIHRoaXMudGVybSA9IHRoaXMudGVybSA/IHRoaXMuZW5mb3Jlc3RDb21wdXRlZE1lbWJlckV4cHJlc3Npb24oKSA6IHRoaXMuZW5mb3Jlc3RQcmltYXJ5RXhwcmVzc2lvbigpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmlzUHVuY3R1YXRvcihsb29rYWhlYWQsICcuJykgJiYgKFxuICAgICAgICB0aGlzLmlzSWRlbnRpZmllcih0aGlzLnBlZWsoMSkpIHx8IHRoaXMuaXNLZXl3b3JkKHRoaXMucGVlaygxKSkpKSB7XG4gICAgICAgIHRoaXMudGVybSA9IHRoaXMuZW5mb3Jlc3RTdGF0aWNNZW1iZXJFeHByZXNzaW9uKCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuaXNUZW1wbGF0ZShsb29rYWhlYWQpKSB7XG4gICAgICAgIHRoaXMudGVybSA9IHRoaXMuZW5mb3Jlc3RUZW1wbGF0ZUxpdGVyYWwoKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0JyYWNlcyhsb29rYWhlYWQpKSB7XG4gICAgICAgIHRoaXMudGVybSA9IHRoaXMuZW5mb3Jlc3RQcmltYXJ5RXhwcmVzc2lvbigpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmlzSWRlbnRpZmllcihsb29rYWhlYWQpKSB7XG4gICAgICAgIHRoaXMudGVybSA9IG5ldyBULklkZW50aWZpZXJFeHByZXNzaW9uKHsgbmFtZTogdGhpcy5lbmZvcmVzdElkZW50aWZpZXIoKSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy50ZXJtO1xuICB9XG5cbiAgZW5mb3Jlc3RCb29sZWFuTGl0ZXJhbCgpIHtcbiAgICByZXR1cm4gbmV3IFQuTGl0ZXJhbEJvb2xlYW5FeHByZXNzaW9uKHtcbiAgICAgIHZhbHVlOiB0aGlzLm1hdGNoUmF3U3ludGF4KCkudmFsKCkgPT09ICd0cnVlJ1xuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RUZW1wbGF0ZUxpdGVyYWwoKSB7XG4gICAgcmV0dXJuIG5ldyBULlRlbXBsYXRlRXhwcmVzc2lvbih7XG4gICAgICB0YWc6IHRoaXMudGVybSxcbiAgICAgIGVsZW1lbnRzOiB0aGlzLmVuZm9yZXN0VGVtcGxhdGVFbGVtZW50cygpXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdFN0cmluZ0xpdGVyYWwoKSB7XG4gICAgcmV0dXJuIG5ldyBULkxpdGVyYWxTdHJpbmdFeHByZXNzaW9uKHtcbiAgICAgIHZhbHVlOiB0aGlzLm1hdGNoUmF3U3ludGF4KCkudmFsKClcbiAgICB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0TnVtZXJpY0xpdGVyYWwoKSB7XG4gICAgbGV0IG51bSA9IHRoaXMubWF0Y2hSYXdTeW50YXgoKTtcbiAgICBpZiAobnVtLnZhbCgpID09PSAxIC8gMCkge1xuICAgICAgcmV0dXJuIG5ldyBULkxpdGVyYWxJbmZpbml0eUV4cHJlc3Npb24oe30pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFQuTGl0ZXJhbE51bWVyaWNFeHByZXNzaW9uKHtcbiAgICAgIHZhbHVlOiBudW0udmFsKClcbiAgICB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0SWRlbnRpZmllckV4cHJlc3Npb24oKSB7XG4gICAgcmV0dXJuIG5ldyBULklkZW50aWZpZXJFeHByZXNzaW9uKHtcbiAgICAgIG5hbWU6IHRoaXMubWF0Y2hSYXdTeW50YXgoKVxuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RSZWd1bGFyRXhwcmVzc2lvbkxpdGVyYWwoKSB7XG4gICAgbGV0IHJlU3R4ID0gdGhpcy5tYXRjaFJhd1N5bnRheCgpO1xuXG4gICAgbGV0IGxhc3RTbGFzaCA9IHJlU3R4LnRva2VuLnZhbHVlLmxhc3RJbmRleE9mKCcvJyk7XG4gICAgbGV0IHBhdHRlcm4gPSByZVN0eC50b2tlbi52YWx1ZS5zbGljZSgxLCBsYXN0U2xhc2gpO1xuICAgIGxldCBmbGFncyA9IHJlU3R4LnRva2VuLnZhbHVlLnNsaWNlKGxhc3RTbGFzaCArIDEpO1xuICAgIHJldHVybiBuZXcgVC5MaXRlcmFsUmVnRXhwRXhwcmVzc2lvbih7XG4gICAgICBwYXR0ZXJuLCBmbGFnc1xuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3ROdWxsTGl0ZXJhbCgpIHtcbiAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICByZXR1cm4gbmV3IFQuTGl0ZXJhbE51bGxFeHByZXNzaW9uKHt9KTtcbiAgfVxuXG4gIGVuZm9yZXN0VGhpc0V4cHJlc3Npb24oKSB7XG4gICAgcmV0dXJuIG5ldyBULlRoaXNFeHByZXNzaW9uKHtcbiAgICAgIHN0eDogdGhpcy5tYXRjaFJhd1N5bnRheCgpXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdEFyZ3VtZW50TGlzdCgpIHtcbiAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgd2hpbGUgKHRoaXMucmVzdC5zaXplID4gMCkge1xuICAgICAgbGV0IGFyZztcbiAgICAgIGlmICh0aGlzLmlzUHVuY3R1YXRvcih0aGlzLnBlZWsoKSwgJy4uLicpKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgICBhcmcgPSBuZXcgVC5TcHJlYWRFbGVtZW50KHtcbiAgICAgICAgICBleHByZXNzaW9uOiB0aGlzLmVuZm9yZXN0RXhwcmVzc2lvbkxvb3AoKVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFyZyA9IHRoaXMuZW5mb3Jlc3RFeHByZXNzaW9uTG9vcCgpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMucmVzdC5zaXplID4gMCkge1xuICAgICAgICB0aGlzLm1hdGNoUHVuY3R1YXRvcignLCcpO1xuICAgICAgfVxuICAgICAgcmVzdWx0LnB1c2goYXJnKTtcbiAgICB9XG4gICAgcmV0dXJuIExpc3QocmVzdWx0KTtcbiAgfVxuXG4gIGVuZm9yZXN0TmV3RXhwcmVzc2lvbigpIHtcbiAgICB0aGlzLm1hdGNoS2V5d29yZCgnbmV3Jyk7XG4gICAgaWYgKHRoaXMuaXNQdW5jdHVhdG9yKHRoaXMucGVlaygpLCAnLicpICYmIHRoaXMuaXNJZGVudGlmaWVyKHRoaXMucGVlaygxKSwgJ3RhcmdldCcpKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgcmV0dXJuIG5ldyBULk5ld1RhcmdldEV4cHJlc3Npb24oe30pO1xuICAgIH1cblxuICAgIGxldCBjYWxsZWUgPSB0aGlzLmVuZm9yZXN0TGVmdEhhbmRTaWRlRXhwcmVzc2lvbih7IGFsbG93Q2FsbDogZmFsc2UgfSk7XG4gICAgbGV0IGFyZ3M7XG4gICAgaWYgKHRoaXMuaXNQYXJlbnModGhpcy5wZWVrKCkpKSB7XG4gICAgICBhcmdzID0gdGhpcy5tYXRjaFBhcmVucygpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcmdzID0gTGlzdCgpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFQuTmV3RXhwcmVzc2lvbih7XG4gICAgICBjYWxsZWUsXG4gICAgICBhcmd1bWVudHM6IGFyZ3NcbiAgICB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0Q29tcHV0ZWRNZW1iZXJFeHByZXNzaW9uKCkge1xuICAgIGxldCBlbmYgPSBuZXcgRW5mb3Jlc3Rlcih0aGlzLm1hdGNoU3F1YXJlcygpLCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG4gICAgcmV0dXJuIG5ldyBULkNvbXB1dGVkTWVtYmVyRXhwcmVzc2lvbih7XG4gICAgICBvYmplY3Q6IHRoaXMudGVybSxcbiAgICAgIGV4cHJlc3Npb246IGVuZi5lbmZvcmVzdEV4cHJlc3Npb24oKVxuICAgIH0pO1xuICB9XG5cbiAgdHJhbnNmb3JtRGVzdHJ1Y3R1cmluZyh0ZXJtOiBUZXJtKSB7XG4gICAgc3dpdGNoICh0ZXJtLnR5cGUpIHtcbiAgICAgIGNhc2UgJ0lkZW50aWZpZXJFeHByZXNzaW9uJzpcbiAgICAgICAgcmV0dXJuIG5ldyBULkJpbmRpbmdJZGVudGlmaWVyKHtuYW1lOiB0ZXJtLm5hbWV9KTtcblxuICAgICAgY2FzZSAnUGFyZW50aGVzaXplZEV4cHJlc3Npb24nOlxuICAgICAgICBpZiAodGVybS5pbm5lci5zaXplID09PSAxICYmIHRoaXMuaXNJZGVudGlmaWVyKHRlcm0uaW5uZXIuZ2V0KDApKSkge1xuICAgICAgICAgIHJldHVybiBuZXcgVC5CaW5kaW5nSWRlbnRpZmllcih7IG5hbWU6IHRlcm0uaW5uZXIuZ2V0KDApLnZhbHVlfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRlcm07XG4gICAgICBjYXNlICdEYXRhUHJvcGVydHknOlxuICAgICAgICByZXR1cm4gbmV3IFQuQmluZGluZ1Byb3BlcnR5UHJvcGVydHkoe1xuICAgICAgICAgIG5hbWU6IHRlcm0ubmFtZSxcbiAgICAgICAgICBiaW5kaW5nOiB0aGlzLnRyYW5zZm9ybURlc3RydWN0dXJpbmdXaXRoRGVmYXVsdCh0ZXJtLmV4cHJlc3Npb24pXG4gICAgICAgIH0pO1xuICAgICAgY2FzZSAnU2hvcnRoYW5kUHJvcGVydHknOlxuICAgICAgICByZXR1cm4gbmV3IFQuQmluZGluZ1Byb3BlcnR5SWRlbnRpZmllcih7XG4gICAgICAgICAgYmluZGluZzogbmV3IFQuQmluZGluZ0lkZW50aWZpZXIoeyBuYW1lOiB0ZXJtLm5hbWUgfSksXG4gICAgICAgICAgaW5pdDogbnVsbFxuICAgICAgICB9KTtcbiAgICAgIGNhc2UgJ09iamVjdEV4cHJlc3Npb24nOlxuICAgICAgICByZXR1cm4gbmV3IFQuT2JqZWN0QmluZGluZyh7XG4gICAgICAgICAgcHJvcGVydGllczogdGVybS5wcm9wZXJ0aWVzLm1hcCh0ID0+IHRoaXMudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZyh0KSlcbiAgICAgICAgfSk7XG4gICAgICBjYXNlICdBcnJheUV4cHJlc3Npb24nOiB7XG4gICAgICAgIGxldCBsYXN0ID0gdGVybS5lbGVtZW50cy5sYXN0KCk7XG4gICAgICAgIGlmIChsYXN0ICE9IG51bGwgJiYgbGFzdC50eXBlID09PSAnU3ByZWFkRWxlbWVudCcpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IFQuQXJyYXlCaW5kaW5nKHtcbiAgICAgICAgICAgIGVsZW1lbnRzOiB0ZXJtLmVsZW1lbnRzLnNsaWNlKDAsIC0xKS5tYXAodCA9PiB0ICYmIHRoaXMudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ1dpdGhEZWZhdWx0KHQpKSxcbiAgICAgICAgICAgIHJlc3RFbGVtZW50OiB0aGlzLnRyYW5zZm9ybURlc3RydWN0dXJpbmdXaXRoRGVmYXVsdChsYXN0LmV4cHJlc3Npb24pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBULkFycmF5QmluZGluZyh7XG4gICAgICAgICAgICBlbGVtZW50czogdGVybS5lbGVtZW50cy5tYXAodCA9PiB0ICYmIHRoaXMudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ1dpdGhEZWZhdWx0KHQpKSxcbiAgICAgICAgICAgIHJlc3RFbGVtZW50OiBudWxsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNhc2UgJ1N0YXRpY1Byb3BlcnR5TmFtZSc6XG4gICAgICAgIHJldHVybiBuZXcgVC5CaW5kaW5nSWRlbnRpZmllcih7XG4gICAgICAgICAgbmFtZTogdGVybS52YWx1ZVxuICAgICAgICB9KTtcbiAgICAgIGNhc2UgJ0NvbXB1dGVkTWVtYmVyRXhwcmVzc2lvbic6XG4gICAgICBjYXNlICdTdGF0aWNNZW1iZXJFeHByZXNzaW9uJzpcbiAgICAgIGNhc2UgJ0FycmF5QmluZGluZyc6XG4gICAgICBjYXNlICdCaW5kaW5nSWRlbnRpZmllcic6XG4gICAgICBjYXNlICdCaW5kaW5nUHJvcGVydHlJZGVudGlmaWVyJzpcbiAgICAgIGNhc2UgJ0JpbmRpbmdQcm9wZXJ0eVByb3BlcnR5JzpcbiAgICAgIGNhc2UgJ0JpbmRpbmdXaXRoRGVmYXVsdCc6XG4gICAgICBjYXNlICdPYmplY3RCaW5kaW5nJzpcbiAgICAgICAgcmV0dXJuIHRlcm07XG4gICAgfVxuICAgIGFzc2VydChmYWxzZSwgJ25vdCBpbXBsZW1lbnRlZCB5ZXQgZm9yICcgKyB0ZXJtLnR5cGUpO1xuICB9XG5cbiAgdHJhbnNmb3JtRGVzdHJ1Y3R1cmluZ1dpdGhEZWZhdWx0KHRlcm06IFRlcm0pIHtcbiAgICBzd2l0Y2ggKHRlcm0udHlwZSkge1xuICAgICAgY2FzZSAnQXNzaWdubWVudEV4cHJlc3Npb24nOlxuICAgICAgICByZXR1cm4gbmV3IFQuQmluZGluZ1dpdGhEZWZhdWx0KHtcbiAgICAgICAgICBiaW5kaW5nOiB0aGlzLnRyYW5zZm9ybURlc3RydWN0dXJpbmcodGVybS5iaW5kaW5nKSxcbiAgICAgICAgICBpbml0OiB0ZXJtLmV4cHJlc3Npb24sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1EZXN0cnVjdHVyaW5nKHRlcm0pO1xuICB9XG5cbiAgZW5mb3Jlc3RDYWxsRXhwcmVzc2lvbigpIHtcbiAgICBsZXQgcGFyZW4gPSB0aGlzLm1hdGNoUGFyZW5zKCk7XG4gICAgcmV0dXJuIG5ldyBULkNhbGxFeHByZXNzaW9uRSh7XG4gICAgICBjYWxsZWU6IHRoaXMudGVybSxcbiAgICAgIGFyZ3VtZW50czogcGFyZW5cbiAgICB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0QXJyb3dFeHByZXNzaW9uKCkge1xuICAgIGxldCBlbmY7XG4gICAgaWYgKHRoaXMuaXNJZGVudGlmaWVyKHRoaXMucGVlaygpKSkge1xuICAgICAgZW5mID0gbmV3IEVuZm9yZXN0ZXIoTGlzdC5vZih0aGlzLmFkdmFuY2UoKSksIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHAgPSB0aGlzLm1hdGNoUGFyZW5zKCk7XG4gICAgICBlbmYgPSBuZXcgRW5mb3Jlc3RlcihwLCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG4gICAgfVxuICAgIGxldCBwYXJhbXMgPSBlbmYuZW5mb3Jlc3RGb3JtYWxQYXJhbWV0ZXJzKCk7XG4gICAgdGhpcy5tYXRjaFB1bmN0dWF0b3IoJz0+Jyk7XG5cbiAgICBsZXQgYm9keTtcbiAgICBpZiAodGhpcy5pc0JyYWNlcyh0aGlzLnBlZWsoKSkpIHtcbiAgICAgIGJvZHkgPSB0aGlzLm1hdGNoQ3VybGllcygpO1xuICAgICAgcmV0dXJuIG5ldyBULkFycm93RXhwcmVzc2lvbkUoeyBwYXJhbXMsIGJvZHkgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVuZiA9IG5ldyBFbmZvcmVzdGVyKHRoaXMucmVzdCwgTGlzdCgpLCB0aGlzLmNvbnRleHQpO1xuICAgICAgYm9keSA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb25Mb29wKCk7XG4gICAgICB0aGlzLnJlc3QgPSBlbmYucmVzdDtcbiAgICAgIHJldHVybiBuZXcgVC5BcnJvd0V4cHJlc3Npb24oeyBwYXJhbXMsIGJvZHkgfSk7XG4gICAgfVxuICB9XG5cblxuICBlbmZvcmVzdFlpZWxkRXhwcmVzc2lvbigpIHtcbiAgICBsZXQga3dkID0gdGhpcy5tYXRjaEtleXdvcmQoJ3lpZWxkJyk7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuXG4gICAgaWYgKHRoaXMucmVzdC5zaXplID09PSAwIHx8IChsb29rYWhlYWQgJiYgIXRoaXMubGluZU51bWJlckVxKGt3ZCwgbG9va2FoZWFkKSkpIHtcbiAgICAgIHJldHVybiBuZXcgVC5ZaWVsZEV4cHJlc3Npb24oe1xuICAgICAgICBleHByZXNzaW9uOiBudWxsXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGlzR2VuZXJhdG9yID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5pc1B1bmN0dWF0b3IodGhpcy5wZWVrKCksICcqJykpIHtcbiAgICAgICAgICBpc0dlbmVyYXRvciA9IHRydWU7XG4gICAgICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICB9XG4gICAgICBsZXQgZXhwciA9IHRoaXMuZW5mb3Jlc3RFeHByZXNzaW9uKCk7XG4gICAgICByZXR1cm4gbmV3IChpc0dlbmVyYXRvciA/IFQuWWllbGRHZW5lcmF0b3JFeHByZXNzaW9uIDogVC5ZaWVsZEV4cHJlc3Npb24pKHtcbiAgICAgICAgZXhwcmVzc2lvbjogZXhwclxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZW5mb3Jlc3RTeW50YXhUZW1wbGF0ZSgpIHtcbiAgICByZXR1cm4gbmV3IFQuU3ludGF4VGVtcGxhdGUoe1xuICAgICAgdGVtcGxhdGU6IHRoaXMubWF0Y2hSYXdEZWxpbWl0ZXIoKVxuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RTdGF0aWNNZW1iZXJFeHByZXNzaW9uKCkge1xuICAgIGxldCBvYmplY3QgPSB0aGlzLnRlcm07XG4gICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgbGV0IHByb3BlcnR5ID0gdGhpcy5tYXRjaFJhd1N5bnRheCgpO1xuXG4gICAgcmV0dXJuIG5ldyBULlN0YXRpY01lbWJlckV4cHJlc3Npb24oe1xuICAgICAgb2JqZWN0OiBvYmplY3QsXG4gICAgICBwcm9wZXJ0eTogcHJvcGVydHlcbiAgICB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0QXJyYXlFeHByZXNzaW9uKCkge1xuICAgIGxldCBhcnIgPSB0aGlzLm1hdGNoU3F1YXJlcygpO1xuXG4gICAgbGV0IGVsZW1lbnRzID0gW107XG5cbiAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIoYXJyLCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG5cbiAgICB3aGlsZSAoZW5mLnJlc3Quc2l6ZSA+IDApIHtcbiAgICAgIGxldCBsb29rYWhlYWQgPSBlbmYucGVlaygpO1xuICAgICAgaWYgKGVuZi5pc1B1bmN0dWF0b3IobG9va2FoZWFkLCAnLCcpKSB7XG4gICAgICAgIGVuZi5hZHZhbmNlKCk7XG4gICAgICAgIGVsZW1lbnRzLnB1c2gobnVsbCk7XG4gICAgICB9IGVsc2UgaWYgKGVuZi5pc1B1bmN0dWF0b3IobG9va2FoZWFkLCAnLi4uJykpIHtcbiAgICAgICAgZW5mLmFkdmFuY2UoKTtcbiAgICAgICAgbGV0IGV4cHJlc3Npb24gPSBlbmYuZW5mb3Jlc3RFeHByZXNzaW9uTG9vcCgpO1xuICAgICAgICBpZiAoZXhwcmVzc2lvbiA9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgZW5mLmNyZWF0ZUVycm9yKGxvb2thaGVhZCwgJ2V4cGVjdGluZyBleHByZXNzaW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxlbWVudHMucHVzaChuZXcgVC5TcHJlYWRFbGVtZW50KHsgZXhwcmVzc2lvbiB9KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgdGVybSA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb25Mb29wKCk7XG4gICAgICAgIGlmICh0ZXJtID09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBlbmYuY3JlYXRlRXJyb3IobG9va2FoZWFkLCAnZXhwZWN0ZWQgZXhwcmVzc2lvbicpO1xuICAgICAgICB9XG4gICAgICAgIGVsZW1lbnRzLnB1c2godGVybSk7XG4gICAgICAgIGVuZi5jb25zdW1lQ29tbWEoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFQuQXJyYXlFeHByZXNzaW9uKHtcbiAgICAgIGVsZW1lbnRzOiBMaXN0KGVsZW1lbnRzKVxuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RPYmplY3RFeHByZXNzaW9uKCkge1xuICAgIGxldCBvYmogPSB0aGlzLm1hdGNoQ3VybGllcygpO1xuXG4gICAgbGV0IHByb3BlcnRpZXMgPSBMaXN0KCk7XG5cbiAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIob2JqLCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG5cbiAgICBsZXQgbGFzdFByb3AgPSBudWxsO1xuICAgIHdoaWxlIChlbmYucmVzdC5zaXplID4gMCkge1xuICAgICAgbGV0IHByb3AgPSBlbmYuZW5mb3Jlc3RQcm9wZXJ0eURlZmluaXRpb24oKTtcbiAgICAgIGVuZi5jb25zdW1lQ29tbWEoKTtcbiAgICAgIHByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzLmNvbmNhdChwcm9wKTtcblxuICAgICAgaWYgKGxhc3RQcm9wID09PSBwcm9wKSB7XG4gICAgICAgIHRocm93IGVuZi5jcmVhdGVFcnJvcihwcm9wLCAnaW52YWxpZCBzeW50YXggaW4gb2JqZWN0Jyk7XG4gICAgICB9XG4gICAgICBsYXN0UHJvcCA9IHByb3A7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBULk9iamVjdEV4cHJlc3Npb24oe1xuICAgICAgcHJvcGVydGllczogcHJvcGVydGllc1xuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RQcm9wZXJ0eURlZmluaXRpb24oKSB7XG5cbiAgICBsZXQge21ldGhvZE9yS2V5LCBraW5kfSA9IHRoaXMuZW5mb3Jlc3RNZXRob2REZWZpbml0aW9uKCk7XG5cbiAgICBzd2l0Y2ggKGtpbmQpIHtcbiAgICAgIGNhc2UgJ21ldGhvZCc6XG4gICAgICAgIHJldHVybiBtZXRob2RPcktleTtcbiAgICAgIGNhc2UgJ2lkZW50aWZpZXInOlxuICAgICAgICBpZiAodGhpcy5pc0Fzc2lnbih0aGlzLnBlZWsoKSkpIHtcbiAgICAgICAgICB0aGlzLmFkdmFuY2UoKTtcbiAgICAgICAgICBsZXQgaW5pdCA9IHRoaXMuZW5mb3Jlc3RFeHByZXNzaW9uTG9vcCgpO1xuICAgICAgICAgIHJldHVybiBuZXcgVC5CaW5kaW5nUHJvcGVydHlJZGVudGlmaWVyKHtcbiAgICAgICAgICAgIGluaXQsIGJpbmRpbmc6IHRoaXMudHJhbnNmb3JtRGVzdHJ1Y3R1cmluZyhtZXRob2RPcktleSlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5pc1B1bmN0dWF0b3IodGhpcy5wZWVrKCksICc6JykpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IFQuU2hvcnRoYW5kUHJvcGVydHkoe1xuICAgICAgICAgICAgbmFtZTogbWV0aG9kT3JLZXkudmFsdWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMubWF0Y2hQdW5jdHVhdG9yKCc6Jyk7XG4gICAgbGV0IGV4cHIgPSB0aGlzLmVuZm9yZXN0RXhwcmVzc2lvbkxvb3AoKTtcblxuICAgIHJldHVybiBuZXcgVC5EYXRhUHJvcGVydHkoe1xuICAgICAgbmFtZTogbWV0aG9kT3JLZXksXG4gICAgICBleHByZXNzaW9uOiBleHByXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdE1ldGhvZERlZmluaXRpb24oKSB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgIGxldCBpc0dlbmVyYXRvciA9IGZhbHNlO1xuICAgIGlmICh0aGlzLmlzUHVuY3R1YXRvcihsb29rYWhlYWQsICcqJykpIHtcbiAgICAgIGlzR2VuZXJhdG9yID0gdHJ1ZTtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzSWRlbnRpZmllcihsb29rYWhlYWQsICdnZXQnKSAmJiB0aGlzLmlzUHJvcGVydHlOYW1lKHRoaXMucGVlaygxKSkpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgbGV0IHtuYW1lfSA9IHRoaXMuZW5mb3Jlc3RQcm9wZXJ0eU5hbWUoKTtcbiAgICAgIHRoaXMubWF0Y2hQYXJlbnMoKTtcbiAgICAgIGxldCBib2R5ID0gdGhpcy5tYXRjaEN1cmxpZXMoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1ldGhvZE9yS2V5OiBuZXcgVC5HZXR0ZXIoeyBuYW1lLCBib2R5IH0pLFxuICAgICAgICBraW5kOiAnbWV0aG9kJ1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNJZGVudGlmaWVyKGxvb2thaGVhZCwgJ3NldCcpICYmIHRoaXMuaXNQcm9wZXJ0eU5hbWUodGhpcy5wZWVrKDEpKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICBsZXQge25hbWV9ID0gdGhpcy5lbmZvcmVzdFByb3BlcnR5TmFtZSgpO1xuICAgICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKHRoaXMubWF0Y2hQYXJlbnMoKSwgTGlzdCgpLCB0aGlzLmNvbnRleHQpO1xuICAgICAgbGV0IHBhcmFtID0gZW5mLmVuZm9yZXN0QmluZGluZ0VsZW1lbnQoKTtcbiAgICAgIGxldCBib2R5ID0gdGhpcy5tYXRjaEN1cmxpZXMoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1ldGhvZE9yS2V5OiBuZXcgVC5TZXR0ZXIoeyBuYW1lLCBwYXJhbSwgYm9keSB9KSxcbiAgICAgICAga2luZDogJ21ldGhvZCdcbiAgICAgIH07XG4gICAgfVxuICAgIGxldCB7bmFtZX0gPSB0aGlzLmVuZm9yZXN0UHJvcGVydHlOYW1lKCk7XG4gICAgaWYgKHRoaXMuaXNQYXJlbnModGhpcy5wZWVrKCkpKSB7XG4gICAgICBsZXQgcGFyYW1zID0gdGhpcy5tYXRjaFBhcmVucygpO1xuICAgICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKHBhcmFtcywgTGlzdCgpLCB0aGlzLmNvbnRleHQpO1xuICAgICAgbGV0IGZvcm1hbFBhcmFtcyA9IGVuZi5lbmZvcmVzdEZvcm1hbFBhcmFtZXRlcnMoKTtcblxuICAgICAgbGV0IGJvZHkgPSB0aGlzLm1hdGNoQ3VybGllcygpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWV0aG9kT3JLZXk6IG5ldyBULk1ldGhvZCh7XG4gICAgICAgICAgaXNHZW5lcmF0b3IsXG4gICAgICAgICAgbmFtZSwgcGFyYW1zOiBmb3JtYWxQYXJhbXMsIGJvZHlcbiAgICAgICAgfSksXG4gICAgICAgIGtpbmQ6ICdtZXRob2QnXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbWV0aG9kT3JLZXk6IG5hbWUsXG4gICAgICBraW5kOiB0aGlzLmlzSWRlbnRpZmllcihsb29rYWhlYWQpIHx8IHRoaXMuaXNLZXl3b3JkKGxvb2thaGVhZCkgPyAnaWRlbnRpZmllcicgOiAncHJvcGVydHknXG4gICAgfTtcbiAgfVxuXG4gIGVuZm9yZXN0UHJvcGVydHlOYW1lKCkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcblxuICAgIGlmICh0aGlzLmlzU3RyaW5nTGl0ZXJhbChsb29rYWhlYWQpIHx8IHRoaXMuaXNOdW1lcmljTGl0ZXJhbChsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBuZXcgVC5TdGF0aWNQcm9wZXJ0eU5hbWUoe1xuICAgICAgICAgIHZhbHVlOiB0aGlzLm1hdGNoUmF3U3ludGF4KClcbiAgICAgICAgfSksXG4gICAgICAgIGJpbmRpbmc6IG51bGxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzQnJhY2tldHMobG9va2FoZWFkKSkge1xuICAgICAgbGV0IGVuZiA9IG5ldyBFbmZvcmVzdGVyKHRoaXMubWF0Y2hTcXVhcmVzKCksIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICAgIGxldCBleHByID0gZW5mLmVuZm9yZXN0RXhwcmVzc2lvbkxvb3AoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5ldyBULkNvbXB1dGVkUHJvcGVydHlOYW1lKHtcbiAgICAgICAgICBleHByZXNzaW9uOiBleHByXG4gICAgICAgIH0pLFxuICAgICAgICBiaW5kaW5nOiBudWxsXG4gICAgICB9O1xuICAgIH1cbiAgICBsZXQgbmFtZSA9IHRoaXMubWF0Y2hSYXdTeW50YXgoKTtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogbmV3IFQuU3RhdGljUHJvcGVydHlOYW1lKHsgdmFsdWU6IG5hbWUgfSksXG4gICAgICBiaW5kaW5nOiBuZXcgVC5CaW5kaW5nSWRlbnRpZmllcih7IG5hbWUgfSlcbiAgICB9O1xuICB9XG5cbiAgZW5mb3Jlc3RGdW5jdGlvbih7aXNFeHByLCBpbkRlZmF1bHR9OiB7aXNFeHByPzogYm9vbGVhbiwgaW5EZWZhdWx0PzogYm9vbGVhbn0pIHtcbiAgICBsZXQgbmFtZSA9IG51bGwsIHBhcmFtcywgYm9keTtcbiAgICBsZXQgaXNHZW5lcmF0b3IgPSBmYWxzZTtcbiAgICAvLyBlYXQgdGhlIGZ1bmN0aW9uIGtleXdvcmRcbiAgICBsZXQgZm5LZXl3b3JkID0gdGhpcy5tYXRjaFJhd1N5bnRheCgpO1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcblxuICAgIGlmICh0aGlzLmlzUHVuY3R1YXRvcihsb29rYWhlYWQsICcqJykpIHtcbiAgICAgIGlzR2VuZXJhdG9yID0gdHJ1ZTtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgICAgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmlzUGFyZW5zKGxvb2thaGVhZCkpIHtcbiAgICAgIG5hbWUgPSB0aGlzLmVuZm9yZXN0QmluZGluZ0lkZW50aWZpZXIoKTtcbiAgICB9IGVsc2UgaWYgKGluRGVmYXVsdCkge1xuICAgICAgbmFtZSA9IG5ldyBULkJpbmRpbmdJZGVudGlmaWVyKHtcbiAgICAgICAgbmFtZTogU3ludGF4LmZyb21JZGVudGlmaWVyKCcqZGVmYXVsdConLCBmbktleXdvcmQpXG4gICAgICB9KTtcbiAgICB9XG5cblxuICAgIHBhcmFtcyA9IHRoaXMubWF0Y2hQYXJlbnMoKTtcblxuXG4gICAgYm9keSA9IHRoaXMubWF0Y2hDdXJsaWVzKCk7XG5cbiAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIocGFyYW1zLCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG4gICAgbGV0IGZvcm1hbFBhcmFtcyA9IGVuZi5lbmZvcmVzdEZvcm1hbFBhcmFtZXRlcnMoKTtcblxuICAgIHJldHVybiBuZXcgKGlzRXhwciA/IFQuRnVuY3Rpb25FeHByZXNzaW9uRSA6IFQuRnVuY3Rpb25EZWNsYXJhdGlvbkUpKHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBpc0dlbmVyYXRvcjogaXNHZW5lcmF0b3IsXG4gICAgICBwYXJhbXM6IGZvcm1hbFBhcmFtcyxcbiAgICAgIGJvZHk6IGJvZHlcbiAgICB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0Rm9ybWFsUGFyYW1ldGVycygpIHtcbiAgICBsZXQgaXRlbXMgPSBbXTtcbiAgICBsZXQgcmVzdCA9IG51bGw7XG4gICAgd2hpbGUgKHRoaXMucmVzdC5zaXplICE9PSAwKSB7XG4gICAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgICBpZiAodGhpcy5pc1B1bmN0dWF0b3IobG9va2FoZWFkLCAnLi4uJykpIHtcbiAgICAgICAgdGhpcy5tYXRjaFB1bmN0dWF0b3IoJy4uLicpO1xuICAgICAgICByZXN0ID0gdGhpcy5lbmZvcmVzdEJpbmRpbmdJZGVudGlmaWVyKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaXRlbXMucHVzaCh0aGlzLmVuZm9yZXN0UGFyYW0oKSk7XG4gICAgICB0aGlzLmNvbnN1bWVDb21tYSgpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFQuRm9ybWFsUGFyYW1ldGVycyh7XG4gICAgICBpdGVtczogTGlzdChpdGVtcyksIHJlc3RcbiAgICB9KTtcbiAgfVxuXG4gIGVuZm9yZXN0UGFyYW0oKSB7XG4gICAgcmV0dXJuIHRoaXMuZW5mb3Jlc3RCaW5kaW5nRWxlbWVudCgpO1xuICB9XG5cbiAgZW5mb3Jlc3RVcGRhdGVFeHByZXNzaW9uKCkge1xuICAgIGxldCBvcGVyYXRvciA9IHRoaXMubWF0Y2hVbmFyeU9wZXJhdG9yKCk7XG5cbiAgICByZXR1cm4gbmV3IFQuVXBkYXRlRXhwcmVzc2lvbih7XG4gICAgICBpc1ByZWZpeDogZmFsc2UsXG4gICAgICBvcGVyYXRvcjogb3BlcmF0b3IudmFsKCksXG4gICAgICBvcGVyYW5kOiB0aGlzLnRyYW5zZm9ybURlc3RydWN0dXJpbmcodGhpcy50ZXJtKVxuICAgIH0pO1xuICB9XG5cbiAgZW5mb3Jlc3RVbmFyeUV4cHJlc3Npb24oKSB7XG4gICAgbGV0IG9wZXJhdG9yID0gdGhpcy5tYXRjaFVuYXJ5T3BlcmF0b3IoKTtcbiAgICB0aGlzLm9wQ3R4LnN0YWNrID0gdGhpcy5vcEN0eC5zdGFjay5wdXNoKHtcbiAgICAgIHByZWM6IHRoaXMub3BDdHgucHJlYyxcbiAgICAgIGNvbWJpbmU6IHRoaXMub3BDdHguY29tYmluZVxuICAgIH0pO1xuICAgIC8vIFRPRE86IGFsbCBidWlsdGlucyBhcmUgMTQsIGN1c3RvbSBvcGVyYXRvcnMgd2lsbCBjaGFuZ2UgdGhpc1xuICAgIHRoaXMub3BDdHgucHJlYyA9IDE0O1xuICAgIHRoaXMub3BDdHguY29tYmluZSA9IHJpZ2h0VGVybSA9PiB7XG4gICAgICBpZiAob3BlcmF0b3IudmFsKCkgPT09ICcrKycgfHwgb3BlcmF0b3IudmFsKCkgPT09ICctLScpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBULlVwZGF0ZUV4cHJlc3Npb24oe1xuICAgICAgICAgIG9wZXJhdG9yOiBvcGVyYXRvci52YWwoKSxcbiAgICAgICAgICBvcGVyYW5kOiB0aGlzLnRyYW5zZm9ybURlc3RydWN0dXJpbmcocmlnaHRUZXJtKSxcbiAgICAgICAgICBpc1ByZWZpeDogdHJ1ZVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgVC5VbmFyeUV4cHJlc3Npb24oe1xuICAgICAgICAgIG9wZXJhdG9yOiBvcGVyYXRvci52YWwoKSxcbiAgICAgICAgICBvcGVyYW5kOiByaWdodFRlcm1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gRVhQUl9MT09QX09QRVJBVE9SO1xuICB9XG5cbiAgZW5mb3Jlc3RDb25kaXRpb25hbEV4cHJlc3Npb24oKSB7XG4gICAgLy8gZmlyc3QsIHBvcCB0aGUgb3BlcmF0b3Igc3RhY2tcbiAgICBsZXQgdGVzdCA9IHRoaXMub3BDdHguY29tYmluZSh0aGlzLnRlcm0pO1xuICAgIGlmICh0aGlzLm9wQ3R4LnN0YWNrLnNpemUgPiAwKSB7XG4gICAgICBsZXQgeyBwcmVjLCBjb21iaW5lIH0gPSB0aGlzLm9wQ3R4LnN0YWNrLmxhc3QoKTtcbiAgICAgIHRoaXMub3BDdHguc3RhY2sgPSB0aGlzLm9wQ3R4LnN0YWNrLnBvcCgpO1xuICAgICAgdGhpcy5vcEN0eC5wcmVjID0gcHJlYztcbiAgICAgIHRoaXMub3BDdHguY29tYmluZSA9IGNvbWJpbmU7XG4gICAgfVxuXG4gICAgdGhpcy5tYXRjaFB1bmN0dWF0b3IoJz8nKTtcbiAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIodGhpcy5yZXN0LCBMaXN0KCksIHRoaXMuY29udGV4dCk7XG4gICAgbGV0IGNvbnNlcXVlbnQgPSBlbmYuZW5mb3Jlc3RFeHByZXNzaW9uTG9vcCgpO1xuICAgIGVuZi5tYXRjaFB1bmN0dWF0b3IoJzonKTtcbiAgICBlbmYgPSBuZXcgRW5mb3Jlc3RlcihlbmYucmVzdCwgTGlzdCgpLCB0aGlzLmNvbnRleHQpO1xuICAgIGxldCBhbHRlcm5hdGUgPSBlbmYuZW5mb3Jlc3RFeHByZXNzaW9uTG9vcCgpO1xuICAgIHRoaXMucmVzdCA9IGVuZi5yZXN0O1xuICAgIHJldHVybiBuZXcgVC5Db25kaXRpb25hbEV4cHJlc3Npb24oe1xuICAgICAgdGVzdCwgY29uc2VxdWVudCwgYWx0ZXJuYXRlXG4gICAgfSk7XG4gIH1cblxuICBlbmZvcmVzdEJpbmFyeUV4cHJlc3Npb24oKSB7XG5cbiAgICBsZXQgbGVmdFRlcm0gPSB0aGlzLnRlcm07XG4gICAgbGV0IG9wU3R4ID0gdGhpcy5wZWVrKCk7XG5cbiAgICBpZiAoKG9wU3R4IGluc3RhbmNlb2YgVC5SYXdTeW50YXgpICYmXG4gICAgICAgIG9wZXJhdG9yTHQodGhpcy5vcEN0eC5wcmVjLFxuICAgICAgICAgICAgICAgICAgIGdldE9wZXJhdG9yUHJlYyhvcFN0eC52YWx1ZS52YWwoKSksXG4gICAgICAgICAgICAgICAgICAgZ2V0T3BlcmF0b3JBc3NvYyhvcFN0eC52YWx1ZS52YWwoKSkpKSB7XG4gICAgICBsZXQgb3AgPSBvcFN0eC52YWx1ZTtcbiAgICAgIHRoaXMub3BDdHguc3RhY2sgPSB0aGlzLm9wQ3R4LnN0YWNrLnB1c2goe1xuICAgICAgICBwcmVjOiB0aGlzLm9wQ3R4LnByZWMsXG4gICAgICAgIGNvbWJpbmU6IHRoaXMub3BDdHguY29tYmluZVxuICAgICAgfSk7XG4gICAgICB0aGlzLm9wQ3R4LnByZWMgPSBnZXRPcGVyYXRvclByZWMob3AudmFsKCkpO1xuICAgICAgdGhpcy5vcEN0eC5jb21iaW5lID0gKHJpZ2h0VGVybSkgPT4ge1xuICAgICAgICByZXR1cm4gbmV3IFQuQmluYXJ5RXhwcmVzc2lvbih7XG4gICAgICAgICAgbGVmdDogbGVmdFRlcm0sXG4gICAgICAgICAgb3BlcmF0b3I6IG9wLnZhbCgpLFxuICAgICAgICAgIHJpZ2h0OiByaWdodFRlcm1cbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgICByZXR1cm4gRVhQUl9MT09QX09QRVJBVE9SO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgdGVybSA9IHRoaXMub3BDdHguY29tYmluZShsZWZ0VGVybSk7XG4gICAgICAvLyB0aGlzLnJlc3QgZG9lcyBub3QgY2hhbmdlXG4gICAgICBsZXQgeyBwcmVjLCBjb21iaW5lIH0gPSB0aGlzLm9wQ3R4LnN0YWNrLmxhc3QoKTtcbiAgICAgIHRoaXMub3BDdHguc3RhY2sgPSB0aGlzLm9wQ3R4LnN0YWNrLnBvcCgpO1xuICAgICAgdGhpcy5vcEN0eC5wcmVjID0gcHJlYztcbiAgICAgIHRoaXMub3BDdHguY29tYmluZSA9IGNvbWJpbmU7XG4gICAgICByZXR1cm4gdGVybTtcbiAgICB9XG4gIH1cblxuICBlbmZvcmVzdFRlbXBsYXRlRWxlbWVudHMoKSB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMubWF0Y2hUZW1wbGF0ZSgpO1xuICAgIGxldCBlbGVtZW50cyA9IGxvb2thaGVhZC50b2tlbi5pdGVtcy5tYXAoaXQgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNEZWxpbWl0ZXIoaXQpKSB7XG4gICAgICAgIGxldCBlbmYgPSBuZXcgRW5mb3Jlc3RlcihpdC5pbm5lci5zbGljZSgxLCBpdC5pbm5lci5zaXplIC0gMSksIExpc3QoKSwgdGhpcy5jb250ZXh0KTtcbiAgICAgICAgcmV0dXJuIGVuZi5lbmZvcmVzdCgnZXhwcmVzc2lvbicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBULlRlbXBsYXRlRWxlbWVudCh7XG4gICAgICAgIHJhd1ZhbHVlOiBpdC52YWx1ZS50b2tlbi5zbGljZS50ZXh0XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gZWxlbWVudHM7XG4gIH1cblxuICBleHBhbmRNYWNybygpIHtcbiAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgd2hpbGUgKHRoaXMuaXNDb21waWxldGltZVRyYW5zZm9ybShsb29rYWhlYWQpKSB7XG4gICAgICBsZXQgbmFtZSA9IHRoaXMubWF0Y2hSYXdTeW50YXgoKTtcblxuICAgICAgbGV0IHN5bnRheFRyYW5zZm9ybSA9IHRoaXMuZ2V0RnJvbUNvbXBpbGV0aW1lRW52aXJvbm1lbnQobmFtZSk7XG4gICAgICBpZiAoc3ludGF4VHJhbnNmb3JtID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihuYW1lLCBgVGhlIG1hY3JvICR7bmFtZS5yZXNvbHZlKHRoaXMuY29udGV4dC5waGFzZSl9IGRvZXMgbm90IGhhdmUgYSBib3VuZCB2YWx1ZWApO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygc3ludGF4VHJhbnNmb3JtLnZhbHVlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IobmFtZSwgYFRoZSBtYWNybyAke25hbWUucmVzb2x2ZSh0aGlzLmNvbnRleHQucGhhc2UpfSB3YXMgbm90IGJvdW5kIHRvIGEgY2FsbGFibGUgdmFsdWU6ICR7c3ludGF4VHJhbnNmb3JtLnZhbHVlfWApO1xuICAgICAgfVxuICAgICAgbGV0IHVzZVNpdGVTY29wZSA9IGZyZXNoU2NvcGUoJ3UnKTtcbiAgICAgIGxldCBpbnRyb2R1Y2VkU2NvcGUgPSBmcmVzaFNjb3BlKCdpJyk7XG4gICAgICAvLyBUT0RPOiBuZWVkcyB0byBiZSBhIGxpc3Qgb2Ygc2NvcGVzIEkgdGhpbmtcbiAgICAgIHRoaXMuY29udGV4dC51c2VTY29wZSA9IHVzZVNpdGVTY29wZTtcblxuICAgICAgbGV0IGN0eCA9IG5ldyBNYWNyb0NvbnRleHQodGhpcywgbmFtZSwgdGhpcy5jb250ZXh0LCB1c2VTaXRlU2NvcGUsIGludHJvZHVjZWRTY29wZSk7XG5cbiAgICAgIGxldCByZXN1bHQgPSBzYW5pdGl6ZVJlcGxhY2VtZW50VmFsdWVzKHN5bnRheFRyYW5zZm9ybS52YWx1ZS5jYWxsKG51bGwsIGN0eCkpO1xuICAgICAgaWYgKCFMaXN0LmlzTGlzdChyZXN1bHQpKSB7XG4gICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IobmFtZSwgJ21hY3JvIG11c3QgcmV0dXJuIGEgbGlzdCBidXQgZ290OiAnICsgcmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIGxldCBzY29wZVJlZHVjZXIgPSBuZXcgU2NvcGVSZWR1Y2VyKFt7c2NvcGU6IGludHJvZHVjZWRTY29wZSwgcGhhc2U6IEFMTF9QSEFTRVMsIGZsaXA6IHRydWV9XSwgdGhpcy5jb250ZXh0LmJpbmRpbmdzLCB0cnVlKTtcbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5tYXAodGVybXMgPT4ge1xuICAgICAgICBpZiAodGVybXMgaW5zdGFuY2VvZiBTeW50YXgpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IFQuUmF3U3ludGF4KHtcbiAgICAgICAgICAgIHZhbHVlOiB0ZXJtc1xuICAgICAgICAgIH0pLnJlZHVjZShzY29wZVJlZHVjZXIpO1xuICAgICAgICB9IGVsc2UgaWYgKCEodGVybXMgaW5zdGFuY2VvZiBUZXJtKSkge1xuICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IobmFtZSwgJ21hY3JvIG11c3QgcmV0dXJuIHN5bnRheCBvYmplY3RzIG9yIHRlcm1zIGJ1dCBnb3Q6ICcgKyB0ZXJtcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRlcm1zLnJlZHVjZShzY29wZVJlZHVjZXIpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMucmVzdCA9IHJlc3VsdC5jb25jYXQoY3R4Ll9yZXN0KHRoaXMpKTtcbiAgICAgIGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN1bWVTZW1pY29sb24oKSB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuXG4gICAgaWYgKGxvb2thaGVhZCAmJiB0aGlzLmlzUHVuY3R1YXRvcihsb29rYWhlYWQsICc7JykpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN1bWVDb21tYSgpIHtcbiAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG5cbiAgICBpZiAobG9va2FoZWFkICYmIHRoaXMuaXNQdW5jdHVhdG9yKGxvb2thaGVhZCwgJywnKSkge1xuICAgICAgdGhpcy5hZHZhbmNlKCk7XG4gICAgfVxuICB9XG5cbiAgc2FmZUNoZWNrKG9iajogU3ludGF4IHwgVGVybSwgdHlwZTogYW55LCB2YWw6ID9zdHJpbmcgPSBudWxsKSB7XG4gICAgaWYgKG9iaiBpbnN0YW5jZW9mIFRlcm0pIHtcbiAgICAgIGlmIChvYmogaW5zdGFuY2VvZiBULlJhd1N5bnRheCkge1xuICAgICAgICByZXR1cm4gb2JqLnZhbHVlICYmICh0eXBlb2Ygb2JqLnZhbHVlLm1hdGNoID09PSAnZnVuY3Rpb24nID8gb2JqLnZhbHVlLm1hdGNoKHR5cGUsIHZhbCkgOiBmYWxzZSk7XG4gICAgICB9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIFQuUmF3RGVsaW1pdGVyKSB7XG4gICAgICAgIHJldHVybiB0eXBlID09PSAnZGVsaW1pdGVyJyB8fCBvYmoua2luZCA9PT0gdHlwZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iaiAmJiAodHlwZW9mIG9iai5tYXRjaCA9PT0gJ2Z1bmN0aW9uJyA/IG9iai5tYXRjaCh0eXBlLCB2YWwpIDogZmFsc2UpO1xuICB9XG5cbiAgaXNUZXJtKHRlcm06IGFueSkge1xuICAgIHJldHVybiB0ZXJtICYmICh0ZXJtIGluc3RhbmNlb2YgVGVybSk7XG4gIH1cblxuICBpc0VPRihvYmo6IFN5bnRheCB8IFRlcm0pIHtcbiAgICByZXR1cm4gdGhpcy5zYWZlQ2hlY2sob2JqLCAnZW9mJyk7XG4gIH1cblxuICBpc0lkZW50aWZpZXIob2JqOiBTeW50YXggfCBUZXJtLCB2YWw6ID9zdHJpbmcgPSBudWxsKSB7XG4gICAgcmV0dXJuIHRoaXMuc2FmZUNoZWNrKG9iaiwgJ2lkZW50aWZpZXInLCB2YWwpO1xuICB9XG5cbiAgaXNQcm9wZXJ0eU5hbWUob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNJZGVudGlmaWVyKG9iaikgfHwgdGhpcy5pc0tleXdvcmQob2JqKSB8fFxuICAgICAgICAgICB0aGlzLmlzTnVtZXJpY0xpdGVyYWwob2JqKSB8fCB0aGlzLmlzU3RyaW5nTGl0ZXJhbChvYmopIHx8IHRoaXMuaXNCcmFja2V0cyhvYmopO1xuICB9XG5cbiAgaXNOdW1lcmljTGl0ZXJhbChvYmo6IFN5bnRheCB8IFRlcm0sIHZhbDogP3N0cmluZyA9IG51bGwpIHtcbiAgICByZXR1cm4gdGhpcy5zYWZlQ2hlY2sob2JqLCAnbnVtYmVyJywgdmFsKTtcbiAgfVxuXG4gIGlzU3RyaW5nTGl0ZXJhbChvYmo6IFN5bnRheCB8IFRlcm0sIHZhbDogP3N0cmluZyA9IG51bGwpIHtcbiAgICByZXR1cm4gdGhpcy5zYWZlQ2hlY2sob2JqLCAnc3RyaW5nJywgdmFsKTtcbiAgfVxuXG4gIGlzVGVtcGxhdGUob2JqOiBTeW50YXggfCBUZXJtLCB2YWw6ID9zdHJpbmcgPSBudWxsKSB7XG4gICAgcmV0dXJuIHRoaXMuc2FmZUNoZWNrKG9iaiwgJ3RlbXBsYXRlJywgdmFsKTtcbiAgfVxuXG4gIGlzU3ludGF4VGVtcGxhdGUob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuc2FmZUNoZWNrKG9iaiwgJ3N5bnRheFRlbXBsYXRlJyk7XG4gIH1cblxuICBpc0Jvb2xlYW5MaXRlcmFsKG9iajogU3ludGF4IHwgVGVybSwgdmFsOiA/c3RyaW5nID0gbnVsbCkge1xuICAgIHJldHVybiB0aGlzLnNhZmVDaGVjayhvYmosICdib29sZWFuJywgdmFsKTtcbiAgfVxuXG4gIGlzTnVsbExpdGVyYWwob2JqOiBTeW50YXggfCBUZXJtLCB2YWw6ID9zdHJpbmcgPSBudWxsKSB7XG4gICAgcmV0dXJuIHRoaXMuc2FmZUNoZWNrKG9iaiwgJ251bGwnLCB2YWwpO1xuICB9XG5cbiAgaXNSZWd1bGFyRXhwcmVzc2lvbihvYmo6IFN5bnRheCB8IFRlcm0sIHZhbDogP3N0cmluZyA9IG51bGwpIHtcbiAgICByZXR1cm4gdGhpcy5zYWZlQ2hlY2sob2JqLCAncmVndWxhckV4cHJlc3Npb24nLCB2YWwpO1xuICB9XG5cbiAgaXNEZWxpbWl0ZXIob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuc2FmZUNoZWNrKG9iaiwgJ2RlbGltaXRlcicpO1xuICB9XG5cbiAgaXNQYXJlbnMob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuc2FmZUNoZWNrKG9iaiwgJ3BhcmVucycpO1xuICB9XG5cbiAgaXNCcmFjZXMob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuc2FmZUNoZWNrKG9iaiwgJ2JyYWNlcycpO1xuICB9XG5cbiAgaXNCcmFja2V0cyhvYmo6IFN5bnRheCB8IFRlcm0pIHtcbiAgICByZXR1cm4gdGhpcy5zYWZlQ2hlY2sob2JqLCAnYnJhY2tldHMnKTtcbiAgfVxuXG4gIGlzQXNzaWduKG9iajogU3ludGF4IHwgVGVybSwgdmFsOiA/c3RyaW5nID0gbnVsbCkge1xuICAgIHJldHVybiB0aGlzLnNhZmVDaGVjayhvYmosICdhc3NpZ24nLCB2YWwpO1xuICB9XG5cblxuICBpc0tleXdvcmQob2JqOiBTeW50YXggfCBUZXJtLCB2YWw6ID9zdHJpbmcgPSBudWxsKSB7XG4gICAgcmV0dXJuIHRoaXMuc2FmZUNoZWNrKG9iaiwgJ2tleXdvcmQnLCB2YWwpO1xuICB9XG5cbiAgaXNQdW5jdHVhdG9yKG9iajogU3ludGF4IHwgVGVybSwgdmFsOiA/c3RyaW5nID0gbnVsbCkge1xuICAgIHJldHVybiB0aGlzLnNhZmVDaGVjayhvYmosICdwdW5jdHVhdG9yJywgdmFsKTtcbiAgfVxuXG4gIGlzT3BlcmF0b3Iob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuICh0aGlzLnNhZmVDaGVjayhvYmosICdwdW5jdHVhdG9yJykgfHxcbiAgICAgICAgICAgIHRoaXMuc2FmZUNoZWNrKG9iaiwgJ2lkZW50aWZpZXInKSB8fFxuICAgICAgICAgICAgdGhpcy5zYWZlQ2hlY2sob2JqLCAna2V5d29yZCcpKSAmJlxuICAgICAgICAgICAgKChvYmogaW5zdGFuY2VvZiBULlJhd1N5bnRheCAmJiBpc09wZXJhdG9yKG9iai52YWx1ZSkpIHx8XG4gICAgICAgICAgICAgKG9iaiBpbnN0YW5jZW9mIFN5bnRheCAmJiBpc09wZXJhdG9yKG9iaikpKTtcbiAgfVxuXG4gIGlzVXBkYXRlT3BlcmF0b3Iob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuc2FmZUNoZWNrKG9iaiwgJ3B1bmN0dWF0b3InLCAnKysnKSB8fFxuICAgICAgICAgICB0aGlzLnNhZmVDaGVjayhvYmosICdwdW5jdHVhdG9yJywgJy0tJyk7XG4gIH1cblxuICBzYWZlUmVzb2x2ZShvYmo6IFN5bnRheCB8IFRlcm0sIHBoYXNlOiBudW1iZXIgfCB7fSkge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBULlJhd1N5bnRheCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmoudmFsdWUucmVzb2x2ZSA9PT0gJ2Z1bmN0aW9uJyA/IEp1c3Qob2JqLnZhbHVlLnJlc29sdmUocGhhc2UpKSA6IE5vdGhpbmcoKTtcbiAgICB9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIFN5bnRheCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmoucmVzb2x2ZSA9PT0gJ2Z1bmN0aW9uJyA/IEp1c3Qob2JqLnJlc29sdmUocGhhc2UpKSA6IE5vdGhpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIE5vdGhpbmcoKTtcbiAgfVxuXG4gIGlzVHJhbnNmb3JtKG9iajogU3ludGF4IHwgVGVybSwgdHJhbnM6IGFueSkge1xuICAgIHJldHVybiB0aGlzLnNhZmVSZXNvbHZlKG9iaiwgdGhpcy5jb250ZXh0LnBoYXNlKVxuICAgICAgICAgICAgICAgLm1hcChuYW1lID0+IHRoaXMuY29udGV4dC5lbnYuZ2V0KG5hbWUpID09PSB0cmFucyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29udGV4dC5zdG9yZS5nZXQobmFtZSkgPT09IHRyYW5zKVxuICAgICAgICAgICAgICAgLmdldE9yRWxzZShmYWxzZSk7XG4gIH1cblxuICBpc1RyYW5zZm9ybUluc3RhbmNlKG9iajogU3ludGF4IHwgVGVybSwgdHJhbnM6IGFueSkge1xuICAgIHJldHVybiB0aGlzLnNhZmVSZXNvbHZlKG9iaiwgdGhpcy5jb250ZXh0LnBoYXNlKVxuICAgICAgICAgICAgICAgLm1hcChuYW1lID0+IHRoaXMuY29udGV4dC5lbnYuZ2V0KG5hbWUpIGluc3RhbmNlb2YgdHJhbnMgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRleHQuc3RvcmUuZ2V0KG5hbWUpIGluc3RhbmNlb2YgdHJhbnMpXG4gICAgICAgICAgICAgICAuZ2V0T3JFbHNlKGZhbHNlKTtcbiAgfVxuXG4gIGlzRm5EZWNsVHJhbnNmb3JtKG9iajogU3ludGF4IHwgVGVybSkge1xuICAgIHJldHVybiB0aGlzLmlzVHJhbnNmb3JtKG9iaiwgRnVuY3Rpb25EZWNsVHJhbnNmb3JtKTtcbiAgfVxuXG4gIGlzVmFyRGVjbFRyYW5zZm9ybShvYmo6IFN5bnRheCB8IFRlcm0pIHtcbiAgICByZXR1cm4gdGhpcy5pc1RyYW5zZm9ybShvYmosIFZhcmlhYmxlRGVjbFRyYW5zZm9ybSk7XG4gIH1cblxuICBpc0xldERlY2xUcmFuc2Zvcm0ob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNUcmFuc2Zvcm0ob2JqLCBMZXREZWNsVHJhbnNmb3JtKTtcbiAgfVxuXG4gIGlzQ29uc3REZWNsVHJhbnNmb3JtKG9iajogU3ludGF4IHwgVGVybSkge1xuICAgIHJldHVybiB0aGlzLmlzVHJhbnNmb3JtKG9iaiwgQ29uc3REZWNsVHJhbnNmb3JtKTtcbiAgfVxuXG4gIGlzU3ludGF4RGVjbFRyYW5zZm9ybShvYmo6IFN5bnRheCB8IFRlcm0pIHtcbiAgICByZXR1cm4gdGhpcy5pc1RyYW5zZm9ybShvYmosIFN5bnRheERlY2xUcmFuc2Zvcm0pO1xuICB9XG5cbiAgaXNTeW50YXhyZWNEZWNsVHJhbnNmb3JtKG9iajogU3ludGF4IHwgVGVybSkge1xuICAgIHJldHVybiB0aGlzLmlzVHJhbnNmb3JtKG9iaiwgU3ludGF4cmVjRGVjbFRyYW5zZm9ybSk7XG4gIH1cblxuICBpc1JldHVyblN0bXRUcmFuc2Zvcm0ob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNUcmFuc2Zvcm0ob2JqLCBSZXR1cm5TdGF0ZW1lbnRUcmFuc2Zvcm0pO1xuICB9XG5cbiAgaXNXaGlsZVRyYW5zZm9ybShvYmo6IFN5bnRheCB8IFRlcm0pIHtcbiAgICByZXR1cm4gdGhpcy5pc1RyYW5zZm9ybShvYmosIFdoaWxlVHJhbnNmb3JtKTtcbiAgfVxuXG4gIGlzRm9yVHJhbnNmb3JtKG9iajogU3ludGF4IHwgVGVybSkge1xuICAgIHJldHVybiB0aGlzLmlzVHJhbnNmb3JtKG9iaiwgRm9yVHJhbnNmb3JtKTtcbiAgfVxuXG4gIGlzU3dpdGNoVHJhbnNmb3JtKG9iajogU3ludGF4IHwgVGVybSkge1xuICAgIHJldHVybiB0aGlzLmlzVHJhbnNmb3JtKG9iaiwgU3dpdGNoVHJhbnNmb3JtKTtcbiAgfVxuXG4gIGlzQnJlYWtUcmFuc2Zvcm0ob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNUcmFuc2Zvcm0ob2JqLCBCcmVha1RyYW5zZm9ybSk7XG4gIH1cblxuICBpc0NvbnRpbnVlVHJhbnNmb3JtKG9iajogU3ludGF4IHwgVGVybSkge1xuICAgIHJldHVybiB0aGlzLmlzVHJhbnNmb3JtKG9iaiwgQ29udGludWVUcmFuc2Zvcm0pO1xuICB9XG5cbiAgaXNEb1RyYW5zZm9ybShvYmo6IFN5bnRheCB8IFRlcm0pIHtcbiAgICByZXR1cm4gdGhpcy5pc1RyYW5zZm9ybShvYmosIERvVHJhbnNmb3JtKTtcbiAgfVxuXG4gIGlzRGVidWdnZXJUcmFuc2Zvcm0ob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNUcmFuc2Zvcm0ob2JqLCBEZWJ1Z2dlclRyYW5zZm9ybSk7XG4gIH1cblxuICBpc1dpdGhUcmFuc2Zvcm0ob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNUcmFuc2Zvcm0ob2JqLCBXaXRoVHJhbnNmb3JtKTtcbiAgfVxuXG4gIGlzVHJ5VHJhbnNmb3JtKG9iajogU3ludGF4IHwgVGVybSkge1xuICAgIHJldHVybiB0aGlzLmlzVHJhbnNmb3JtKG9iaiwgVHJ5VHJhbnNmb3JtKTtcbiAgfVxuXG4gIGlzVGhyb3dUcmFuc2Zvcm0ob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNUcmFuc2Zvcm0ob2JqLCBUaHJvd1RyYW5zZm9ybSk7XG4gIH1cblxuICBpc0lmVHJhbnNmb3JtKG9iajogU3ludGF4IHwgVGVybSkge1xuICAgIHJldHVybiB0aGlzLmlzVHJhbnNmb3JtKG9iaiwgSWZUcmFuc2Zvcm0pO1xuICB9XG5cbiAgaXNOZXdUcmFuc2Zvcm0ob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNUcmFuc2Zvcm0ob2JqLCBOZXdUcmFuc2Zvcm0pO1xuICB9XG5cbiAgaXNDb21waWxldGltZVRyYW5zZm9ybShvYmo6IFN5bnRheCB8IFRlcm0pIHtcbiAgICByZXR1cm4gdGhpcy5pc1RyYW5zZm9ybUluc3RhbmNlKG9iaiwgQ29tcGlsZXRpbWVUcmFuc2Zvcm0pO1xuICB9XG5cbiAgaXNNb2R1bGVOYW1lc3BhY2VUcmFuc2Zvcm0ob2JqOiBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNUcmFuc2Zvcm1JbnN0YW5jZShvYmosIE1vZHVsZU5hbWVzcGFjZVRyYW5zZm9ybSk7XG4gIH1cblxuICBpc1ZhckJpbmRpbmdUcmFuc2Zvcm0ob2JqOiBTeW50YXggfCBUZXJtKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNUcmFuc2Zvcm1JbnN0YW5jZShvYmosIFZhckJpbmRpbmdUcmFuc2Zvcm0pO1xuICB9XG5cbiAgZ2V0RnJvbUNvbXBpbGV0aW1lRW52aXJvbm1lbnQodGVybTogU3ludGF4KSB7XG4gICAgaWYgKHRoaXMuY29udGV4dC5lbnYuaGFzKHRlcm0ucmVzb2x2ZSh0aGlzLmNvbnRleHQucGhhc2UpKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5lbnYuZ2V0KHRlcm0ucmVzb2x2ZSh0aGlzLmNvbnRleHQucGhhc2UpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29udGV4dC5zdG9yZS5nZXQodGVybS5yZXNvbHZlKHRoaXMuY29udGV4dC5waGFzZSkpO1xuICB9XG5cbiAgbGluZU51bWJlckVxKGE6ID8oVC5UZXJtIHwgU3ludGF4KSwgYjogPyhTeW50YXggfCBULlRlcm0pKSB7XG4gICAgaWYgKCEoYSAmJiBiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gZ2V0TGluZU51bWJlcihhKSA9PT0gZ2V0TGluZU51bWJlcihiKTtcbiAgfVxuXG4gIG1hdGNoUmF3RGVsaW1pdGVyKCk6IExpc3Q8VC5TeW50YXhUZXJtPiB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMuYWR2YW5jZSgpO1xuICAgIGlmIChsb29rYWhlYWQgaW5zdGFuY2VvZiBULlJhd0RlbGltaXRlcikge1xuICAgICAgcmV0dXJuIGxvb2thaGVhZC5pbm5lcjtcbiAgICB9XG4gICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihsb29rYWhlYWQsICdleHBlY3RpbmcgYSBSYXdEZWxpbWl0ZXInKTtcbiAgfVxuXG4gIG1hdGNoUmF3U3ludGF4KCk6IFN5bnRheCB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMuYWR2YW5jZSgpO1xuICAgIGlmIChsb29rYWhlYWQgaW5zdGFuY2VvZiBULlJhd1N5bnRheCkge1xuICAgICAgcmV0dXJuIGxvb2thaGVhZC52YWx1ZTtcbiAgICB9XG4gICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihsb29rYWhlYWQsICdleHBlY3RpbmcgYSBSYXdTeW50YXgnKTtcbiAgfVxuXG4gIG1hdGNoSWRlbnRpZmllcih2YWw/OiBzdHJpbmcpIHtcbiAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgaWYgKHRoaXMuaXNJZGVudGlmaWVyKGxvb2thaGVhZCwgdmFsKSkge1xuICAgICAgcmV0dXJuIHRoaXMubWF0Y2hSYXdTeW50YXgoKTtcbiAgICB9XG4gICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihsb29rYWhlYWQsICdleHBlY3RpbmcgYW4gaWRlbnRpZmllcicpO1xuICB9XG5cbiAgbWF0Y2hLZXl3b3JkKHZhbDogc3RyaW5nKSB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgIGlmICh0aGlzLmlzS2V5d29yZChsb29rYWhlYWQsIHZhbCkpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hdGNoUmF3U3ludGF4KCk7XG4gICAgfVxuICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IobG9va2FoZWFkLCAnZXhwZWN0aW5nICcgKyB2YWwpO1xuICB9XG5cbiAgbWF0Y2hMaXRlcmFsKCkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAodGhpcy5pc051bWVyaWNMaXRlcmFsKGxvb2thaGVhZCkgfHxcbiAgICAgICAgdGhpcy5pc1N0cmluZ0xpdGVyYWwobG9va2FoZWFkKSB8fFxuICAgICAgICB0aGlzLmlzQm9vbGVhbkxpdGVyYWwobG9va2FoZWFkKSB8fFxuICAgICAgICB0aGlzLmlzTnVsbExpdGVyYWwobG9va2FoZWFkKSB8fFxuICAgICAgICB0aGlzLmlzVGVtcGxhdGUobG9va2FoZWFkKSB8fFxuICAgICAgICB0aGlzLmlzUmVndWxhckV4cHJlc3Npb24obG9va2FoZWFkKSkge1xuICAgICAgcmV0dXJuIHRoaXMubWF0Y2hSYXdTeW50YXgoKTtcbiAgICB9XG4gICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihsb29rYWhlYWQsICdleHBlY3RpbmcgYSBsaXRlcmFsJyk7XG4gIH1cblxuICBtYXRjaFN0cmluZ0xpdGVyYWwoKSB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgIGlmICh0aGlzLmlzU3RyaW5nTGl0ZXJhbChsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXRjaFJhd1N5bnRheCgpO1xuICAgIH1cbiAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKGxvb2thaGVhZCwgJ2V4cGVjdGluZyBhIHN0cmluZyBsaXRlcmFsJyk7XG4gIH1cblxuICBtYXRjaFRlbXBsYXRlKCkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAodGhpcy5pc1RlbXBsYXRlKGxvb2thaGVhZCkpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hdGNoUmF3U3ludGF4KCk7XG4gICAgfVxuICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IobG9va2FoZWFkLCAnZXhwZWN0aW5nIGEgdGVtcGxhdGUgbGl0ZXJhbCcpO1xuICB9XG5cbiAgbWF0Y2hQYXJlbnMoKTogTGlzdDxULlN5bnRheFRlcm0+IHtcbiAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5wZWVrKCk7XG4gICAgaWYgKHRoaXMuaXNQYXJlbnMobG9va2FoZWFkKSkge1xuICAgICAgbGV0IGlubmVyID0gdGhpcy5tYXRjaFJhd0RlbGltaXRlcigpO1xuICAgICAgcmV0dXJuIGlubmVyLnNsaWNlKDEsIGlubmVyLnNpemUgLSAxKTtcbiAgICB9XG4gICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihsb29rYWhlYWQsICdleHBlY3RpbmcgcGFyZW5zJyk7XG4gIH1cblxuICBtYXRjaEN1cmxpZXMoKSB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgIGlmICh0aGlzLmlzQnJhY2VzKGxvb2thaGVhZCkpIHtcbiAgICAgIGxldCBpbm5lciA9IHRoaXMubWF0Y2hSYXdEZWxpbWl0ZXIoKTtcbiAgICAgIHJldHVybiBpbm5lci5zbGljZSgxLCBpbm5lci5zaXplIC0gMSk7XG4gICAgfVxuICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IobG9va2FoZWFkLCAnZXhwZWN0aW5nIGN1cmx5IGJyYWNlcycpO1xuICB9XG5cbiAgbWF0Y2hTcXVhcmVzKCk6IExpc3Q8VC5TeW50YXhUZXJtPiB7XG4gICAgbGV0IGxvb2thaGVhZCA9IHRoaXMucGVlaygpO1xuICAgIGlmICh0aGlzLmlzQnJhY2tldHMobG9va2FoZWFkKSkge1xuICAgICAgbGV0IGlubmVyID0gdGhpcy5tYXRjaFJhd0RlbGltaXRlcigpO1xuICAgICAgcmV0dXJuIGlubmVyLnNsaWNlKDEsIGlubmVyLnNpemUgLSAxKTtcbiAgICB9XG4gICAgdGhyb3cgdGhpcy5jcmVhdGVFcnJvcihsb29rYWhlYWQsICdleHBlY3Rpbmcgc3F1YXJlIGJyYWNlcycpO1xuICB9XG5cbiAgbWF0Y2hVbmFyeU9wZXJhdG9yKCkge1xuICAgIGxldCBsb29rYWhlYWQgPSB0aGlzLm1hdGNoUmF3U3ludGF4KCk7XG4gICAgaWYgKGlzVW5hcnlPcGVyYXRvcihsb29rYWhlYWQpKSB7XG4gICAgICByZXR1cm4gbG9va2FoZWFkO1xuICAgIH1cbiAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKGxvb2thaGVhZCwgJ2V4cGVjdGluZyBhIHVuYXJ5IG9wZXJhdG9yJyk7XG4gIH1cblxuICBtYXRjaFB1bmN0dWF0b3IodmFsOiBzdHJpbmcpIHtcbiAgICBsZXQgbG9va2FoZWFkID0gdGhpcy5tYXRjaFJhd1N5bnRheCgpO1xuICAgIGlmICh0aGlzLmlzUHVuY3R1YXRvcihsb29rYWhlYWQpKSB7XG4gICAgICBpZiAodHlwZW9mIHZhbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKGxvb2thaGVhZC52YWwoKSA9PT0gdmFsKSB7XG4gICAgICAgICAgcmV0dXJuIGxvb2thaGVhZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUVycm9yKGxvb2thaGVhZCxcbiAgICAgICAgICAgICdleHBlY3RpbmcgYSAnICsgdmFsICsgJyBwdW5jdHVhdG9yJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBsb29rYWhlYWQ7XG4gICAgfVxuICAgIHRocm93IHRoaXMuY3JlYXRlRXJyb3IobG9va2FoZWFkLCAnZXhwZWN0aW5nIGEgcHVuY3R1YXRvcicpO1xuICB9XG5cbiAgY3JlYXRlRXJyb3Ioc3R4OiBTeW50YXggfCBUZXJtLCBtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBsZXQgY3R4ID0gJyc7XG4gICAgbGV0IG9mZmVuZGluZyA9IHN0eDtcbiAgICBpZiAodGhpcy5yZXN0LnNpemUgPiAwKSB7XG4gICAgICBjdHggPSB0aGlzLnJlc3Quc2xpY2UoMCwgMjApLm1hcCh0ZXJtID0+IHtcbiAgICAgICAgaWYgKHRlcm0gaW5zdGFuY2VvZiBULlJhd0RlbGltaXRlcikge1xuICAgICAgICAgIHJldHVybiB0ZXJtLmlubmVyO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBMaXN0Lm9mKHRlcm0pO1xuICAgICAgfSkuZmxhdHRlbigpLm1hcChzID0+IHtcbiAgICAgICAgbGV0IHN2YWwgPSBzIGluc3RhbmNlb2YgVC5SYXdTeW50YXggPyBzLnZhbHVlLnZhbCgpIDogcy50b1N0cmluZygpO1xuICAgICAgICBpZiAocyA9PT0gb2ZmZW5kaW5nKSB7XG4gICAgICAgICAgcmV0dXJuICdfXycgKyBzdmFsICsgJ19fJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3ZhbDtcbiAgICAgIH0pLmpvaW4oJyAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3R4ID0gb2ZmZW5kaW5nLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgRXJyb3IobWVzc2FnZSArICdcXG4nICsgY3R4KTtcblxuICB9XG59XG4iXX0=