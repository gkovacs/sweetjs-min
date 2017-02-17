'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.wrapInTerms = wrapInTerms;

var _errors = require('./errors');

var _immutable = require('immutable');

var _enforester = require('./enforester');

var _syntax = require('./syntax');

var _syntax2 = _interopRequireDefault(_syntax);

var _ramda = require('ramda');

var _ = _interopRequireWildcard(_ramda);

var _scopeReducer = require('./scope-reducer');

var _scopeReducer2 = _interopRequireDefault(_scopeReducer);

var _sweetSpec = require('sweet-spec');

var T = _interopRequireWildcard(_sweetSpec);

var S = _interopRequireWildcard(_sweetSpec);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function wrapInTerms(stx) {
  return stx.map(s => {
    if (s.isTemplate()) {
      s.token.items = s.token.items.map(t => {
        if (t instanceof _syntax2.default) {
          return wrapInTerms(_immutable.List.of(t)).first();
        }
        return t;
      });
    } else if (s.isParens() || s.isBraces() || s.isBrackets() || s.isSyntaxTemplate()) {
      return new S.RawDelimiter({
        kind: s.isBraces() ? 'braces' : s.isParens() ? 'parens' : s.isBrackets() ? 'brackets' : 'syntaxTemplate',
        inner: wrapInTerms(s.token)
      });
    }
    return new S.RawSyntax({
      value: s
    });
  });
}

const privateData = new WeakMap();

function cloneEnforester(enf) {
  const { rest, prev, context } = enf;
  return new _enforester.Enforester(rest, prev, context);
}

function Marker() {}

/*
ctx :: {
  of: (Syntax) -> ctx
  next: (String) -> Syntax or Term
}
*/
class MacroContext {

  constructor(enf, name, context, useScope, introducedScope) {
    const startMarker = new Marker();
    const startEnf = cloneEnforester(enf);
    const priv = {
      name,
      context,
      enf: startEnf,
      startMarker,
      markers: new Map([[startMarker, enf]])
    };

    if (useScope && introducedScope) {
      priv.noScopes = false;
      priv.useScope = useScope;
      priv.introducedScope = introducedScope;
    } else {
      priv.noScopes = true;
    }
    privateData.set(this, priv);
    this.reset(); // set current enforester

    this[Symbol.iterator] = () => this;
  }

  name() {
    const { name } = privateData.get(this);
    return name;
  }

  contextify(delim) {
    if (!(delim instanceof T.RawDelimiter)) {
      throw new Error(`Can only contextify a delimiter but got ${ delim }`);
    }
    const { context } = privateData.get(this);

    let enf = new _enforester.Enforester(delim.inner.slice(1, delim.inner.size - 1), (0, _immutable.List)(), context);
    return new MacroContext(enf, 'inner', context);
  }

  expand(type) {
    const { enf } = privateData.get(this);
    if (enf.rest.size === 0) {
      return {
        done: true,
        value: null
      };
    }
    enf.expandMacro();
    let originalRest = enf.rest;
    let value;
    switch (type) {
      case 'AssignmentExpression':
      case 'expr':
        value = enf.enforestExpressionLoop();
        break;
      case 'Expression':
        value = enf.enforestExpression();
        break;
      case 'Statement':
      case 'stmt':
        value = enf.enforestStatement();
        break;
      case 'BlockStatement':
      case 'WhileStatement':
      case 'IfStatement':
      case 'ForStatement':
      case 'SwitchStatement':
      case 'BreakStatement':
      case 'ContinueStatement':
      case 'DebuggerStatement':
      case 'WithStatement':
      case 'TryStatement':
      case 'ThrowStatement':
      case 'ClassDeclaration':
      case 'FunctionDeclaration':
      case 'LabeledStatement':
      case 'VariableDeclarationStatement':
      case 'ReturnStatement':
      case 'ExpressionStatement':
        value = enf.enforestStatement();
        (0, _errors.expect)(_.whereEq({ type }, value), `Expecting a ${ type }`, value, originalRest);
        break;
      case 'YieldExpression':
        value = enf.enforestYieldExpression();
        break;
      case 'ClassExpression':
        value = enf.enforestClass({ isExpr: true });
        break;
      case 'ArrowExpression':
        value = enf.enforestArrowExpression();
        break;
      case 'NewExpression':
        value = enf.enforestNewExpression();
        break;
      case 'ThisExpression':
      case 'FunctionExpression':
      case 'IdentifierExpression':
      case 'LiteralNumericExpression':
      case 'LiteralInfinityExpression':
      case 'LiteralStringExpression':
      case 'TemplateExpression':
      case 'LiteralBooleanExpression':
      case 'LiteralNullExpression':
      case 'LiteralRegExpExpression':
      case 'ObjectExpression':
      case 'ArrayExpression':
        value = enf.enforestPrimaryExpression();
        break;
      case 'UnaryExpression':
      case 'UpdateExpression':
      case 'BinaryExpression':
      case 'StaticMemberExpression':
      case 'ComputedMemberExpression':
      case 'CompoundAssignmentExpression':
      case 'ConditionalExpression':
        value = enf.enforestExpressionLoop();
        (0, _errors.expect)(_.whereEq({ type }, value), `Expecting a ${ type }`, value, originalRest);
        break;
      default:
        throw new Error('Unknown term type: ' + type);
    }
    return {
      done: false,
      value: value
    };
  }

  _rest(enf) {
    const priv = privateData.get(this);
    if (priv.markers.get(priv.startMarker) === enf) {
      return priv.enf.rest;
    }
    throw Error('Unauthorized access!');
  }

  reset(marker) {
    const priv = privateData.get(this);
    let enf;
    if (marker == null) {
      // go to the beginning
      enf = priv.markers.get(priv.startMarker);
    } else if (marker && marker instanceof Marker) {
      // marker could be from another context
      if (priv.markers.has(marker)) {
        enf = priv.markers.get(marker);
      } else {
        throw new Error('marker must originate from this context');
      }
    } else {
      throw new Error('marker must be an instance of Marker');
    }
    priv.enf = cloneEnforester(enf);
  }

  mark() {
    const priv = privateData.get(this);
    let marker;

    // the idea here is that marking at the beginning shouldn't happen more than once.
    // We can reuse startMarker.
    if (priv.enf.rest === priv.markers.get(priv.startMarker).rest) {
      marker = priv.startMarker;
    } else if (priv.enf.rest.isEmpty()) {
      // same reason as above
      if (!priv.endMarker) priv.endMarker = new Marker();
      marker = priv.endMarker;
    } else {
      //TODO(optimization/dubious): check that there isn't already a marker for this index?
      marker = new Marker();
    }
    if (!priv.markers.has(marker)) {
      priv.markers.set(marker, cloneEnforester(priv.enf));
    }
    return marker;
  }

  next() {
    const { enf, noScopes, useScope, introducedScope, context } = privateData.get(this);
    if (enf.rest.size === 0) {
      return {
        done: true,
        value: null
      };
    }
    let value = enf.advance();
    if (!noScopes) {
      value = value.reduce(new _scopeReducer2.default([{ scope: useScope, phase: _syntax.ALL_PHASES, flip: false }, { scope: introducedScope, phase: _syntax.ALL_PHASES, flip: true }], context.bindings));
    }
    return {
      done: false,
      value: value
    };
  }
}
exports.default = MacroContext;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWNyby1jb250ZXh0LmpzIl0sIm5hbWVzIjpbIndyYXBJblRlcm1zIiwiXyIsIlQiLCJTIiwic3R4IiwibWFwIiwicyIsImlzVGVtcGxhdGUiLCJ0b2tlbiIsIml0ZW1zIiwidCIsIm9mIiwiZmlyc3QiLCJpc1BhcmVucyIsImlzQnJhY2VzIiwiaXNCcmFja2V0cyIsImlzU3ludGF4VGVtcGxhdGUiLCJSYXdEZWxpbWl0ZXIiLCJraW5kIiwiaW5uZXIiLCJSYXdTeW50YXgiLCJ2YWx1ZSIsInByaXZhdGVEYXRhIiwiV2Vha01hcCIsImNsb25lRW5mb3Jlc3RlciIsImVuZiIsInJlc3QiLCJwcmV2IiwiY29udGV4dCIsIk1hcmtlciIsIk1hY3JvQ29udGV4dCIsImNvbnN0cnVjdG9yIiwibmFtZSIsInVzZVNjb3BlIiwiaW50cm9kdWNlZFNjb3BlIiwic3RhcnRNYXJrZXIiLCJzdGFydEVuZiIsInByaXYiLCJtYXJrZXJzIiwiTWFwIiwibm9TY29wZXMiLCJzZXQiLCJyZXNldCIsIlN5bWJvbCIsIml0ZXJhdG9yIiwiZ2V0IiwiY29udGV4dGlmeSIsImRlbGltIiwiRXJyb3IiLCJzbGljZSIsInNpemUiLCJleHBhbmQiLCJ0eXBlIiwiZG9uZSIsImV4cGFuZE1hY3JvIiwib3JpZ2luYWxSZXN0IiwiZW5mb3Jlc3RFeHByZXNzaW9uTG9vcCIsImVuZm9yZXN0RXhwcmVzc2lvbiIsImVuZm9yZXN0U3RhdGVtZW50Iiwid2hlcmVFcSIsImVuZm9yZXN0WWllbGRFeHByZXNzaW9uIiwiZW5mb3Jlc3RDbGFzcyIsImlzRXhwciIsImVuZm9yZXN0QXJyb3dFeHByZXNzaW9uIiwiZW5mb3Jlc3ROZXdFeHByZXNzaW9uIiwiZW5mb3Jlc3RQcmltYXJ5RXhwcmVzc2lvbiIsIl9yZXN0IiwibWFya2VyIiwiaGFzIiwibWFyayIsImlzRW1wdHkiLCJlbmRNYXJrZXIiLCJuZXh0IiwiYWR2YW5jZSIsInJlZHVjZSIsInNjb3BlIiwicGhhc2UiLCJmbGlw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QUVMaEMsZUFBTztBQUZGLE9BQVA7QUFJRDtBQUNELFFBQUlBLFFBQVFJLElBQUlnRCxPQUFKLEVBQVo7QUFDQSxRQUFJLENBQUNqQyxRQUFMLEVBQWU7QUFDYm5CLGNBQVFBLE1BQU1xRCxNQUFOLENBQWEsMkJBQWlCLENBQ3BDLEVBQUVDLE9BQU8xQyxRQUFULEVBQW1CMkMseUJBQW5CLEVBQXNDQyxNQUFNLEtBQTVDLEVBRG9DLEVBRXBDLEVBQUVGLE9BQU96QyxlQUFULEVBQTBCMEMseUJBQTFCLEVBQTZDQyxNQUFNLElBQW5ELEVBRm9DLENBQWpCLEVBR2xCakQsUUFBUWtELFFBSFUsQ0FBYixDQUFSO0FBSUQ7QUFDRCxXQUFPO0FBQ0x6QixZQUFNLEtBREQ7QUFFTGhDLGFBQU9BO0FBRkYsS0FBUDtBQUlEO0FBck0rQjtrQkFBYlMsWSIsImZpbGUiOiJtYWNyby1jb250ZXh0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZXhwZWN0IH0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHsgTGlzdCB9IGZyb20gJ2ltbXV0YWJsZSc7XG5pbXBvcnQgeyBFbmZvcmVzdGVyIH0gZnJvbSAnLi9lbmZvcmVzdGVyJztcbmltcG9ydCB7IEFMTF9QSEFTRVMgfSBmcm9tICcuL3N5bnRheCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ3JhbWRhJztcbmltcG9ydCBTY29wZVJlZHVjZXIgZnJvbSAnLi9zY29wZS1yZWR1Y2VyJztcbmltcG9ydCAqIGFzIFQgZnJvbSAnc3dlZXQtc3BlYyc7XG5pbXBvcnQgVGVybSwgKiBhcyBTIGZyb20gJ3N3ZWV0LXNwZWMnO1xuaW1wb3J0IFN5bnRheCBmcm9tICcuL3N5bnRheCc7XG5cbmV4cG9ydCBmdW5jdGlvbiB3cmFwSW5UZXJtcyhzdHg6IExpc3Q8U3ludGF4Pik6IExpc3Q8VGVybT4ge1xuICByZXR1cm4gc3R4Lm1hcChzID0+IHtcbiAgICBpZiAocy5pc1RlbXBsYXRlKCkpIHtcbiAgICAgIHMudG9rZW4uaXRlbXMgPSBzLnRva2VuLml0ZW1zLm1hcCh0ID0+IHtcbiAgICAgICAgaWYgKHQgaW5zdGFuY2VvZiBTeW50YXgpIHtcbiAgICAgICAgICByZXR1cm4gd3JhcEluVGVybXMoTGlzdC5vZih0KSkuZmlyc3QoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdDtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAocy5pc1BhcmVucygpIHx8IHMuaXNCcmFjZXMoKSB8fCBzLmlzQnJhY2tldHMoKSB8fCBzLmlzU3ludGF4VGVtcGxhdGUoKSkge1xuICAgICAgcmV0dXJuIG5ldyBTLlJhd0RlbGltaXRlcih7XG4gICAgICAgIGtpbmQ6IHMuaXNCcmFjZXMoKSA/ICdicmFjZXMnIDogcy5pc1BhcmVucygpID8gJ3BhcmVucycgOiBzLmlzQnJhY2tldHMoKSA/ICdicmFja2V0cycgOiAnc3ludGF4VGVtcGxhdGUnLFxuICAgICAgICBpbm5lcjogd3JhcEluVGVybXMocy50b2tlbilcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFMuUmF3U3ludGF4KHtcbiAgICAgIHZhbHVlOiBzXG4gICAgfSk7XG4gIH0pO1xufVxuXG5cbmNvbnN0IHByaXZhdGVEYXRhID0gbmV3IFdlYWtNYXAoKTtcblxuZnVuY3Rpb24gY2xvbmVFbmZvcmVzdGVyKGVuZikge1xuICBjb25zdCB7IHJlc3QsIHByZXYsIGNvbnRleHQgfSA9IGVuZjtcbiAgcmV0dXJuIG5ldyBFbmZvcmVzdGVyKHJlc3QsIHByZXYsIGNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiBNYXJrZXIgKCkge31cblxuLypcbmN0eCA6OiB7XG4gIG9mOiAoU3ludGF4KSAtPiBjdHhcbiAgbmV4dDogKFN0cmluZykgLT4gU3ludGF4IG9yIFRlcm1cbn1cbiovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNYWNyb0NvbnRleHQge1xuXG4gIGNvbnN0cnVjdG9yKGVuZiwgbmFtZSwgY29udGV4dCwgdXNlU2NvcGUsIGludHJvZHVjZWRTY29wZSkge1xuICAgIGNvbnN0IHN0YXJ0TWFya2VyID0gbmV3IE1hcmtlcigpO1xuICAgIGNvbnN0IHN0YXJ0RW5mID0gY2xvbmVFbmZvcmVzdGVyKGVuZik7XG4gICAgY29uc3QgcHJpdiA9IHtcbiAgICAgIG5hbWUsXG4gICAgICBjb250ZXh0LFxuICAgICAgZW5mOiBzdGFydEVuZixcbiAgICAgIHN0YXJ0TWFya2VyLFxuICAgICAgbWFya2VyczogbmV3IE1hcChbW3N0YXJ0TWFya2VyLCBlbmZdXSksXG4gICAgfTtcblxuICAgIGlmICh1c2VTY29wZSAmJiBpbnRyb2R1Y2VkU2NvcGUpIHtcbiAgICAgIHByaXYubm9TY29wZXMgPSBmYWxzZTtcbiAgICAgIHByaXYudXNlU2NvcGUgPSB1c2VTY29wZTtcbiAgICAgIHByaXYuaW50cm9kdWNlZFNjb3BlID0gaW50cm9kdWNlZFNjb3BlO1xuICAgIH0gZWxzZSB7XG4gICAgICBwcml2Lm5vU2NvcGVzID0gdHJ1ZTtcbiAgICB9XG4gICAgcHJpdmF0ZURhdGEuc2V0KHRoaXMsIHByaXYpO1xuICAgIHRoaXMucmVzZXQoKTsgLy8gc2V0IGN1cnJlbnQgZW5mb3Jlc3RlclxuXG4gICAgdGhpc1tTeW1ib2wuaXRlcmF0b3JdID0gKCkgPT4gdGhpcztcbiAgfVxuXG4gIG5hbWUoKSB7XG4gICAgY29uc3QgeyBuYW1lIH0gPSBwcml2YXRlRGF0YS5nZXQodGhpcyk7XG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cblxuICBjb250ZXh0aWZ5KGRlbGltOiBhbnkpIHtcbiAgICBpZiAoIShkZWxpbSBpbnN0YW5jZW9mIFQuUmF3RGVsaW1pdGVyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gb25seSBjb250ZXh0aWZ5IGEgZGVsaW1pdGVyIGJ1dCBnb3QgJHtkZWxpbX1gKTtcbiAgICB9XG4gICAgY29uc3QgeyBjb250ZXh0IH0gPSBwcml2YXRlRGF0YS5nZXQodGhpcyk7XG5cbiAgICBsZXQgZW5mID0gbmV3IEVuZm9yZXN0ZXIoZGVsaW0uaW5uZXIuc2xpY2UoMSwgZGVsaW0uaW5uZXIuc2l6ZSAtIDEpLCBMaXN0KCksIGNvbnRleHQpO1xuICAgIHJldHVybiBuZXcgTWFjcm9Db250ZXh0KGVuZiwgJ2lubmVyJywgY29udGV4dCk7XG4gIH1cblxuICBleHBhbmQodHlwZSkge1xuICAgIGNvbnN0IHsgZW5mIH0gPSBwcml2YXRlRGF0YS5nZXQodGhpcyk7XG4gICAgaWYgKGVuZi5yZXN0LnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgIHZhbHVlOiBudWxsXG4gICAgICB9O1xuICAgIH1cbiAgICBlbmYuZXhwYW5kTWFjcm8oKTtcbiAgICBsZXQgb3JpZ2luYWxSZXN0ID0gZW5mLnJlc3Q7XG4gICAgbGV0IHZhbHVlO1xuICAgIHN3aXRjaCh0eXBlKSB7XG4gICAgICBjYXNlICdBc3NpZ25tZW50RXhwcmVzc2lvbic6XG4gICAgICBjYXNlICdleHByJzpcbiAgICAgICAgdmFsdWUgPSBlbmYuZW5mb3Jlc3RFeHByZXNzaW9uTG9vcCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ0V4cHJlc3Npb24nOlxuICAgICAgICB2YWx1ZSA9IGVuZi5lbmZvcmVzdEV4cHJlc3Npb24oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnc3RtdCc6XG4gICAgICAgIHZhbHVlID0gZW5mLmVuZm9yZXN0U3RhdGVtZW50KCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnQmxvY2tTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnV2hpbGVTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnSWZTdGF0ZW1lbnQnOlxuICAgICAgY2FzZSAnRm9yU3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ1N3aXRjaFN0YXRlbWVudCc6XG4gICAgICBjYXNlICdCcmVha1N0YXRlbWVudCc6XG4gICAgICBjYXNlICdDb250aW51ZVN0YXRlbWVudCc6XG4gICAgICBjYXNlICdEZWJ1Z2dlclN0YXRlbWVudCc6XG4gICAgICBjYXNlICdXaXRoU3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ1RyeVN0YXRlbWVudCc6XG4gICAgICBjYXNlICdUaHJvd1N0YXRlbWVudCc6XG4gICAgICBjYXNlICdDbGFzc0RlY2xhcmF0aW9uJzpcbiAgICAgIGNhc2UgJ0Z1bmN0aW9uRGVjbGFyYXRpb24nOlxuICAgICAgY2FzZSAnTGFiZWxlZFN0YXRlbWVudCc6XG4gICAgICBjYXNlICdWYXJpYWJsZURlY2xhcmF0aW9uU3RhdGVtZW50JzpcbiAgICAgIGNhc2UgJ1JldHVyblN0YXRlbWVudCc6XG4gICAgICBjYXNlICdFeHByZXNzaW9uU3RhdGVtZW50JzpcbiAgICAgICAgdmFsdWUgPSBlbmYuZW5mb3Jlc3RTdGF0ZW1lbnQoKTtcbiAgICAgICAgZXhwZWN0KF8ud2hlcmVFcSh7dHlwZX0sIHZhbHVlKSwgYEV4cGVjdGluZyBhICR7dHlwZX1gLCB2YWx1ZSwgb3JpZ2luYWxSZXN0KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdZaWVsZEV4cHJlc3Npb24nOlxuICAgICAgICB2YWx1ZSA9IGVuZi5lbmZvcmVzdFlpZWxkRXhwcmVzc2lvbigpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ0NsYXNzRXhwcmVzc2lvbic6XG4gICAgICAgIHZhbHVlID0gZW5mLmVuZm9yZXN0Q2xhc3Moe2lzRXhwcjogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ0Fycm93RXhwcmVzc2lvbic6XG4gICAgICAgIHZhbHVlID0gZW5mLmVuZm9yZXN0QXJyb3dFeHByZXNzaW9uKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnTmV3RXhwcmVzc2lvbic6XG4gICAgICAgIHZhbHVlID0gZW5mLmVuZm9yZXN0TmV3RXhwcmVzc2lvbigpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1RoaXNFeHByZXNzaW9uJzpcbiAgICAgIGNhc2UgJ0Z1bmN0aW9uRXhwcmVzc2lvbic6XG4gICAgICBjYXNlICdJZGVudGlmaWVyRXhwcmVzc2lvbic6XG4gICAgICBjYXNlICdMaXRlcmFsTnVtZXJpY0V4cHJlc3Npb24nOlxuICAgICAgY2FzZSAnTGl0ZXJhbEluZmluaXR5RXhwcmVzc2lvbic6XG4gICAgICBjYXNlICdMaXRlcmFsU3RyaW5nRXhwcmVzc2lvbic6XG4gICAgICBjYXNlICdUZW1wbGF0ZUV4cHJlc3Npb24nOlxuICAgICAgY2FzZSAnTGl0ZXJhbEJvb2xlYW5FeHByZXNzaW9uJzpcbiAgICAgIGNhc2UgJ0xpdGVyYWxOdWxsRXhwcmVzc2lvbic6XG4gICAgICBjYXNlICdMaXRlcmFsUmVnRXhwRXhwcmVzc2lvbic6XG4gICAgICBjYXNlICdPYmplY3RFeHByZXNzaW9uJzpcbiAgICAgIGNhc2UgJ0FycmF5RXhwcmVzc2lvbic6XG4gICAgICAgIHZhbHVlID0gZW5mLmVuZm9yZXN0UHJpbWFyeUV4cHJlc3Npb24oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdVbmFyeUV4cHJlc3Npb24nOlxuICAgICAgY2FzZSAnVXBkYXRlRXhwcmVzc2lvbic6XG4gICAgICBjYXNlICdCaW5hcnlFeHByZXNzaW9uJzpcbiAgICAgIGNhc2UgJ1N0YXRpY01lbWJlckV4cHJlc3Npb24nOlxuICAgICAgY2FzZSAnQ29tcHV0ZWRNZW1iZXJFeHByZXNzaW9uJzpcbiAgICAgIGNhc2UgJ0NvbXBvdW5kQXNzaWdubWVudEV4cHJlc3Npb24nOlxuICAgICAgY2FzZSAnQ29uZGl0aW9uYWxFeHByZXNzaW9uJzpcbiAgICAgICAgdmFsdWUgPSBlbmYuZW5mb3Jlc3RFeHByZXNzaW9uTG9vcCgpO1xuICAgICAgICBleHBlY3QoXy53aGVyZUVxKHt0eXBlfSwgdmFsdWUpLCBgRXhwZWN0aW5nIGEgJHt0eXBlfWAsIHZhbHVlLCBvcmlnaW5hbFJlc3QpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biB0ZXJtIHR5cGU6ICcgKyB0eXBlKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgdmFsdWU6IHZhbHVlXG4gICAgfTtcbiAgfVxuXG4gIF9yZXN0KGVuZikge1xuICAgIGNvbnN0IHByaXYgPSBwcml2YXRlRGF0YS5nZXQodGhpcyk7XG4gICAgaWYgKHByaXYubWFya2Vycy5nZXQocHJpdi5zdGFydE1hcmtlcikgPT09IGVuZikge1xuICAgICAgcmV0dXJuIHByaXYuZW5mLnJlc3Q7XG4gICAgfVxuICAgIHRocm93IEVycm9yKCdVbmF1dGhvcml6ZWQgYWNjZXNzIScpO1xuICB9XG5cbiAgcmVzZXQobWFya2VyKSB7XG4gICAgY29uc3QgcHJpdiA9IHByaXZhdGVEYXRhLmdldCh0aGlzKTtcbiAgICBsZXQgZW5mO1xuICAgIGlmIChtYXJrZXIgPT0gbnVsbCkge1xuICAgICAgLy8gZ28gdG8gdGhlIGJlZ2lubmluZ1xuICAgICAgZW5mID0gcHJpdi5tYXJrZXJzLmdldChwcml2LnN0YXJ0TWFya2VyKTtcbiAgICB9IGVsc2UgaWYgKG1hcmtlciAmJiBtYXJrZXIgaW5zdGFuY2VvZiBNYXJrZXIpIHtcbiAgICAgIC8vIG1hcmtlciBjb3VsZCBiZSBmcm9tIGFub3RoZXIgY29udGV4dFxuICAgICAgaWYgKHByaXYubWFya2Vycy5oYXMobWFya2VyKSkge1xuICAgICAgICBlbmYgPSBwcml2Lm1hcmtlcnMuZ2V0KG1hcmtlcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21hcmtlciBtdXN0IG9yaWdpbmF0ZSBmcm9tIHRoaXMgY29udGV4dCcpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ21hcmtlciBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIE1hcmtlcicpO1xuICAgIH1cbiAgICBwcml2LmVuZiA9IGNsb25lRW5mb3Jlc3RlcihlbmYpO1xuICB9XG5cbiAgbWFyaygpIHtcbiAgICBjb25zdCBwcml2ID0gcHJpdmF0ZURhdGEuZ2V0KHRoaXMpO1xuICAgIGxldCBtYXJrZXI7XG5cbiAgICAvLyB0aGUgaWRlYSBoZXJlIGlzIHRoYXQgbWFya2luZyBhdCB0aGUgYmVnaW5uaW5nIHNob3VsZG4ndCBoYXBwZW4gbW9yZSB0aGFuIG9uY2UuXG4gICAgLy8gV2UgY2FuIHJldXNlIHN0YXJ0TWFya2VyLlxuICAgIGlmIChwcml2LmVuZi5yZXN0ID09PSBwcml2Lm1hcmtlcnMuZ2V0KHByaXYuc3RhcnRNYXJrZXIpLnJlc3QpIHtcbiAgICAgIG1hcmtlciA9IHByaXYuc3RhcnRNYXJrZXI7XG4gICAgfSBlbHNlIGlmIChwcml2LmVuZi5yZXN0LmlzRW1wdHkoKSkge1xuICAgICAgLy8gc2FtZSByZWFzb24gYXMgYWJvdmVcbiAgICAgIGlmICghcHJpdi5lbmRNYXJrZXIpIHByaXYuZW5kTWFya2VyID0gbmV3IE1hcmtlcigpO1xuICAgICAgbWFya2VyID0gcHJpdi5lbmRNYXJrZXI7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vVE9ETyhvcHRpbWl6YXRpb24vZHViaW91cyk6IGNoZWNrIHRoYXQgdGhlcmUgaXNuJ3QgYWxyZWFkeSBhIG1hcmtlciBmb3IgdGhpcyBpbmRleD9cbiAgICAgIG1hcmtlciA9IG5ldyBNYXJrZXIoKTtcbiAgICB9XG4gICAgaWYgKCFwcml2Lm1hcmtlcnMuaGFzKG1hcmtlcikpIHtcbiAgICAgIHByaXYubWFya2Vycy5zZXQobWFya2VyLCBjbG9uZUVuZm9yZXN0ZXIocHJpdi5lbmYpKTtcbiAgICB9XG4gICAgcmV0dXJuIG1hcmtlcjtcbiAgfVxuXG4gIG5leHQoKSB7XG4gICAgY29uc3QgeyBlbmYsIG5vU2NvcGVzLCB1c2VTY29wZSwgaW50cm9kdWNlZFNjb3BlLCBjb250ZXh0IH0gPSBwcml2YXRlRGF0YS5nZXQodGhpcyk7XG4gICAgaWYgKGVuZi5yZXN0LnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRvbmU6IHRydWUsXG4gICAgICAgIHZhbHVlOiBudWxsXG4gICAgICB9O1xuICAgIH1cbiAgICBsZXQgdmFsdWUgPSBlbmYuYWR2YW5jZSgpO1xuICAgIGlmICghbm9TY29wZXMpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUucmVkdWNlKG5ldyBTY29wZVJlZHVjZXIoW1xuICAgICAgICB7IHNjb3BlOiB1c2VTY29wZSwgcGhhc2U6IEFMTF9QSEFTRVMsIGZsaXA6IGZhbHNlIH0sXG4gICAgICAgIHsgc2NvcGU6IGludHJvZHVjZWRTY29wZSwgcGhhc2U6IEFMTF9QSEFTRVMsIGZsaXA6IHRydWV9XG4gICAgICBdLCBjb250ZXh0LmJpbmRpbmdzKSk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBkb25lOiBmYWxzZSxcbiAgICAgIHZhbHVlOiB2YWx1ZVxuICAgIH07XG4gIH1cbn1cbiJdfQ==