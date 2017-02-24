'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ALL_PHASES = exports.Types = undefined;

var _immutable = require('immutable');

var _errors = require('./errors');

var _bindingMap = require('./binding-map');

var _bindingMap2 = _interopRequireDefault(_bindingMap);

var _ramdaFantasy = require('ramda-fantasy');

var _ramda = require('ramda');

var _ = _interopRequireWildcard(_ramda);

var _sweetSpec = require('sweet-spec');

var T = _interopRequireWildcard(_sweetSpec);

var _tokens = require('./tokens');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getFirstSlice(stx) {
  if (!stx || typeof stx.isDelimiter !== 'function') return null; // TODO: should not have to do this
  if (!stx.isDelimiter()) {
    return stx.token.slice;
  }
  return stx.token.get(0).token.slice;
}


function sizeDecending(a, b) {
  if (a.scopes.size > b.scopes.size) {
    return -1;
  } else if (b.scopes.size > a.scopes.size) {
    return 1;
  } else {
    return 0;
  }
}

let Types = exports.Types = {
  null: {
    match: token => !Types.delimiter.match(token) && token.type === _tokens.TokenType.NULL,
    create: (value, stx) => new Syntax({
      type: _tokens.TokenType.NULL,
      value: null
    }, stx)
  },
  number: {
    match: token => !Types.delimiter.match(token) && token.type.klass === _tokens.TokenClass.NumericLiteral,
    create: (value, stx) => new Syntax({
      type: _tokens.TokenType.NUMBER,
      value
    }, stx)
  },
  string: {
    match: token => !Types.delimiter.match(token) && token.type.klass === _tokens.TokenClass.StringLiteral,
    create: (value, stx) => new Syntax({
      type: _tokens.TokenType.STRING,
      str: value
    }, stx)
  },
  punctuator: {
    match: token => !Types.delimiter.match(token) && token.type.klass === _tokens.TokenClass.Punctuator,
    create: (value, stx) => new Syntax({
      type: {
        klass: _tokens.TokenClass.Punctuator,
        name: value
      },
      value
    }, stx)
  },
  keyword: {
    match: token => !Types.delimiter.match(token) && token.type.klass === _tokens.TokenClass.Keyword,
    create: (value, stx) => new Syntax({
      type: {
        klass: _tokens.TokenClass.Keyword,
        name: value
      },
      value
    }, stx)
  },
  identifier: {
    match: token => !Types.delimiter.match(token) && token.type.klass === _tokens.TokenClass.Ident,
    create: (value, stx) => new Syntax({
      type: _tokens.TokenType.IDENTIFIER,
      value
    }, stx)
  },
  regularExpression: {
    match: token => !Types.delimiter.match(token) && token.type.klass === _tokens.TokenClass.RegularExpression,
    create: (value, stx) => new Syntax({
      type: _tokens.TokenType.REGEXP,
      value
    }, stx)
  },
  braces: {
    match: token => Types.delimiter.match(token) && token.get(0).token.type === _tokens.TokenType.LBRACE,
    create: (inner, stx) => {
      let left = new T.RawSyntax({
        value: new Syntax({
          type: _tokens.TokenType.LBRACE,
          value: '{',
          slice: getFirstSlice(stx)
        })
      });
      let right = new T.RawSyntax({
        value: new Syntax({
          type: _tokens.TokenType.RBRACE,
          value: '}',
          slice: getFirstSlice(stx)
        })
      });
      return new T.RawDelimiter({
        kind: 'braces',
        inner: _immutable.List.of(left).concat(inner).push(right)
      });
    }
  },
  brackets: {
    match: token => Types.delimiter.match(token) && token.get(0).token.type === _tokens.TokenType.LBRACK,
    create: (inner, stx) => {
      let left = new T.RawSyntax({
        value: new Syntax({
          type: _tokens.TokenType.LBRACK,
          value: '[',
          slice: getFirstSlice(stx)
        })
      });
      let right = new T.RawSyntax({
        value: new Syntax({
          type: _tokens.TokenType.RBRACK,
          value: ']',
          slice: getFirstSlice(stx)
        })
      });
      return new T.RawDelimiter({
        kind: 'brackets',
        inner: _immutable.List.of(left).concat(inner).push(right)
      });
    }
  },
  parens: {
    match: token => Types.delimiter.match(token) && token.get(0).token.type === _tokens.TokenType.LPAREN,
    create: (inner, stx) => {
      let left = new T.RawSyntax({
        value: new Syntax({
          type: _tokens.TokenType.LPAREN,
          value: '(',
          slice: getFirstSlice(stx)
        })
      });
      let right = new T.RawSyntax({
        value: new Syntax({
          type: _tokens.TokenType.RPAREN,
          value: ')',
          slice: getFirstSlice(stx)
        })
      });
      return new T.RawDelimiter({
        kind: 'parens',
        inner: _immutable.List.of(left).concat(inner).push(right)
      });
    }
  },

  assign: {
    match: token => {
      if (Types.punctuator.match(token)) {
        switch (token.value) {
          case '=':
          case '|=':
          case '^=':
          case '&=':
          case '<<=':
          case '>>=':
          case '>>>=':
          case '+=':
          case '-=':
          case '*=':
          case '/=':
          case '%=':
            return true;
          default:
            return false;
        }
      }
      return false;
    }
  },

  boolean: {
    match: token => !Types.delimiter.match(token) && token.type === _tokens.TokenType.TRUE || token.type === _tokens.TokenType.FALSE
  },

  template: {
    match: token => !Types.delimiter.match(token) && token.type === _tokens.TokenType.TEMPLATE
  },

  delimiter: {
    match: token => _immutable.List.isList(token)
  },

  syntaxTemplate: {
    match: token => Types.delimiter.match(token) && token.get(0).val() === '#`'
  },

  eof: {
    match: token => !Types.delimiter.match(token) && token.type === _tokens.TokenType.EOS
  }
};
const ALL_PHASES = exports.ALL_PHASES = {};

class Syntax {

  constructor(token, oldstx) {
    this.token = token;
    this.bindings = oldstx && oldstx.bindings != null ? oldstx.bindings : new _bindingMap2.default();
    this.scopesets = oldstx && oldstx.scopesets != null ? oldstx.scopesets : {
      all: (0, _immutable.List)(),
      phase: (0, _immutable.Map)()
    };
    Object.freeze(this);
  }
  // token: Token | List<Token>;


  static of(token, stx) {
    return new Syntax(token, stx);
  }

  static from(type, value, stx) {
    if (!Types[type]) {
      throw new Error(type + ' is not a valid type');
    } else if (!Types[type].create) {
      throw new Error('Cannot create a syntax from type ' + type);
    }
    let newstx = Types[type].create(value, stx);
    let slice = getFirstSlice(stx);
    if (slice != null && newstx.token != null) {
      newstx.token.slice = slice;
    }
    return newstx;
  }

  from(type, value) {
    // TODO: this is gross, fix
    let s = Syntax.from(type, value, this);
    if (s instanceof Syntax) {
      return new T.RawSyntax({ value: s });
    }
    return s;
  }

  fromNull() {
    return this.from('null', null);
  }

  fromNumber(value) {
    return this.from('number', value);
  }

  fromString(value) {
    return this.from('string', value);
  }

  fromPunctuator(value) {
    return this.from('punctuator', value);
  }

  fromKeyword(value) {
    return this.from('keyword', value);
  }

  fromIdentifier(value) {
    return this.from('identifier', value);
  }

  fromRegularExpression(value) {
    return this.from('regularExpression', value);
  }

  static fromNull(stx) {
    return Syntax.from('null', null, stx);
  }

  static fromNumber(value, stx) {
    return Syntax.from('number', value, stx);
  }

  static fromString(value, stx) {
    return Syntax.from('string', value, stx);
  }

  static fromPunctuator(value, stx) {
    return Syntax.from('punctuator', value, stx);
  }

  static fromKeyword(value, stx) {
    return Syntax.from('keyword', value, stx);
  }

  static fromIdentifier(value, stx) {
    return Syntax.from('identifier', value, stx);
  }

  static fromRegularExpression(value, stx) {
    return Syntax.from('regularExpression', value, stx);
  }

  // () -> string
  resolve(phase) {
    (0, _errors.assert)(phase != null, 'must provide a phase to resolve');
    let allScopes = this.scopesets.all;
    let stxScopes = this.scopesets.phase.has(phase) ? this.scopesets.phase.get(phase) : (0, _immutable.List)();
    stxScopes = allScopes.concat(stxScopes);
    if (stxScopes.size === 0 || !(this.match('identifier') || this.match('keyword'))) {
      return this.token.value;
    }
    let scope = stxScopes.last();
    let bindings = this.bindings;
    if (scope) {
      // List<{ scopes: List<Scope>, binding: Symbol }>
      let scopesetBindingList = bindings.get(this);

      if (scopesetBindingList) {
        // { scopes: List<Scope>, binding: Symbol }
        let biggestBindingPair = scopesetBindingList.filter(({ scopes }) => {
          return scopes.isSubset(stxScopes);
        }).sort(sizeDecending);

        if (biggestBindingPair.size >= 2 && biggestBindingPair.get(0).scopes.size === biggestBindingPair.get(1).scopes.size) {
          let debugBase = '{' + stxScopes.map(s => s.toString()).join(', ') + '}';
          let debugAmbigousScopesets = biggestBindingPair.map(({ scopes }) => {
            return '{' + scopes.map(s => s.toString()).join(', ') + '}';
          }).join(', ');
          throw new Error('Scopeset ' + debugBase + ' has ambiguous subsets ' + debugAmbigousScopesets);
        } else if (biggestBindingPair.size !== 0) {
          let bindingStr = biggestBindingPair.get(0).binding.toString();
          if (_ramdaFantasy.Maybe.isJust(biggestBindingPair.get(0).alias)) {
            // null never happens because we just checked if it is a Just
            return biggestBindingPair.get(0).alias.getOrElse(null).resolve(phase);
          }
          return bindingStr;
        }
      }
    }
    return this.token.value;
  }

  val() {
    (0, _errors.assert)(!this.match('delimiter'), 'cannot get the val of a delimiter');
    if (this.match('string')) {
      return this.token.str;
    }
    if (this.match('template')) {
      if (!this.token.items) return this.token.value;
      return this.token.items.map(el => {
        if (typeof el.match === 'function' && el.match('delimiter')) {
          return '${...}';
        }
        return el.slice.text;
      }).join('');
    }
    return this.token.value;
  }

  lineNumber() {
    if (!this.match('delimiter')) {
      return this.token.slice.startLocation.line;
    } else {
      return this.token.get(0).lineNumber();
    }
  }

  setLineNumber(line) {
    let newTok = {};
    if (this.isDelimiter()) {
      newTok = this.token.map(s => s.setLineNumber(line));
    } else {
      for (let key of Object.keys(this.token)) {
        newTok[key] = this.token[key];
      }
      (0, _errors.assert)(newTok.slice && newTok.slice.startLocation, 'all tokens must have line info');
      newTok.slice.startLocation.line = line;
    }
    return new Syntax(newTok, this);
  }

  // () -> List<Syntax>
  // inner() {
  //   assert(this.match("delimiter"), "can only get the inner of a delimiter");
  //   return this.token.slice(1, this.token.size - 1);
  // }

  addScope(scope, bindings, phase, options = { flip: false }) {
    let token = this.match('delimiter') ? this.token.map(s => s.addScope(scope, bindings, phase, options)) : this.token;
    if (this.match('template')) {
      token = _.merge(token, {
        items: token.items.map(it => {
          if (it instanceof Syntax && it.match('delimiter')) {
            return it.addScope(scope, bindings, phase, options);
          }
          return it;
        })
      });
    }
    let oldScopeset;
    if (phase === ALL_PHASES) {
      oldScopeset = this.scopesets.all;
    } else {
      oldScopeset = this.scopesets.phase.has(phase) ? this.scopesets.phase.get(phase) : (0, _immutable.List)();
    }
    let newScopeset;
    if (options.flip) {
      let index = oldScopeset.indexOf(scope);
      if (index !== -1) {
        newScopeset = oldScopeset.remove(index);
      } else {
        newScopeset = oldScopeset.push(scope);
      }
    } else {
      newScopeset = oldScopeset.push(scope);
    }
    let newstx = {
      bindings,
      scopesets: {
        all: this.scopesets.all,
        phase: this.scopesets.phase
      }
    };

    if (phase === ALL_PHASES) {
      newstx.scopesets.all = newScopeset;
    } else {
      newstx.scopesets.phase = newstx.scopesets.phase.set(phase, newScopeset);
    }
    return new Syntax(token, newstx);
  }

  removeScope(scope, phase) {
    let token = this.match('delimiter') ? this.token.map(s => s.removeScope(scope, phase)) : this.token;
    let phaseScopeset = this.scopesets.phase.has(phase) ? this.scopesets.phase.get(phase) : (0, _immutable.List)();
    let allScopeset = this.scopesets.all;
    let newstx = {
      bindings: this.bindings,
      scopesets: {
        all: this.scopesets.all,
        phase: this.scopesets.phase
      }
    };

    let phaseIndex = phaseScopeset.indexOf(scope);
    let allIndex = allScopeset.indexOf(scope);
    if (phaseIndex !== -1) {
      newstx.scopesets.phase = this.scopesets.phase.set(phase, phaseScopeset.remove(phaseIndex));
    } else if (allIndex !== -1) {
      newstx.scopesets.all = allScopeset.remove(allIndex);
    }
    return new Syntax(token, newstx);
  }

  match(type, value) {
    if (!Types[type]) {
      throw new Error(type + ' is an invalid type');
    }
    return Types[type].match(this.token) && (value == null || (value instanceof RegExp ? value.test(this.val()) : this.val() == value));
  }

  isIdentifier(value) {
    return this.match('identifier', value);
  }

  isAssign(value) {
    return this.match('assign', value);
  }

  isBooleanLiteral(value) {
    return this.match('boolean', value);
  }

  isKeyword(value) {
    return this.match('keyword', value);
  }

  isNullLiteral(value) {
    return this.match('null', value);
  }

  isNumericLiteral(value) {
    return this.match('number', value);
  }

  isPunctuator(value) {
    return this.match('punctuator', value);
  }

  isStringLiteral(value) {
    return this.match('string', value);
  }

  isRegularExpression(value) {
    return this.match('regularExpression', value);
  }

  isTemplate(value) {
    return this.match('template', value);
  }

  isDelimiter(value) {
    return this.match('delimiter', value);
  }

  isParens(value) {
    return this.match('parens', value);
  }

  isBraces(value) {
    return this.match('braces', value);
  }

  isBrackets(value) {
    return this.match('brackets', value);
  }

  isSyntaxTemplate(value) {
    return this.match('syntaxTemplate', value);
  }

  isEOF(value) {
    return this.match('eof', value);
  }

  toString() {
    if (this.match('delimiter')) {
      return this.token.map(s => s.toString()).join(' ');
    }
    if (this.match('string')) {
      return '\'' + this.token.str;
    }
    if (this.match('template')) {
      return this.val();
    }
    return this.token.value;
  }
}
exports.default = Syntax;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zeW50YXguanMiXSwibmFtZXMiOlsiXyIsIlQiLCJnZXRGaXJzdFNsaWNlIiwic3R4IiwiaXNEZWxpbWl0ZXIiLCJ0b2tlbiIsInNsaWNlIiwiZ2V0Iiwic2l6ZURlY2VuZGluZyIsImEiLCJiIiwic2NvcGVzIiwic2l6ZSIsIlR5cGVzIiwibnVsbCIsIm1hdGNoIiwiZGVsaW1pdGVyIiwidHlwZSIsIk5VTEwiLCJjcmVhdGUiLCJ2YWx1ZSIsIlN5bnRheCIsIm51bWJlciIsImtsYXNzIiwiTnVtZXJpY0xpdGVyYWwiLCJOVU1CRVIiLCJzdHJpbmciLCJTdHJpbmdMaXRlcmFsIiwiU1RSSU5HIiwic3RyIiwicHVuY3R1YXRvciIsIlB1bmN0dWF0b3IiLCJuYW1lIiwia2V5d29yZCIsIktleXdvcmQiLCJpZGVudGlmaWVyIiwiSWRlbnQiLCJJREVOVElGSUVSIiwicmVndWxhckV4cHJlc3Npb24iLCJSZWd1bGFyRXhwcmVzc2lvbiIsIlJFR0VYUCIsImJyYWNlcyIsIkxCUkFDRSIsImlubmVyIiwibGVmdCIsIlJhd1N5bnRheCIsInJpZ2h0IiwiUkJSQUNFIiwiUmF3RGVsaW1pdGVyIiwia2luZCIsIm9mIiwiY29uY2F0IiwicHVzaCIsImJyYWNrZXRzIiwiTEJSQUNLIiwiUkJSQUNLIiwicGFyZW5zIiwiTFBBUkVOIiwiUlBBUkVOIiwiYXNzaWduIiwiYm9vbGVhbiIsIlRSVUUiLCJGQUxTRSIsInRlbXBsYXRlIiwiVEVNUExBVEUiLCJpc0xpc3QiLCJzeW50YXhUZW1wbGF0ZSIsInZhbCIsImVvZiIsIkVPUyIsIkFMTF9QSEFTRVMiLCJjb25zdHJ1Y3RvciIsIm9sZHN0eCIsImJpbmRpbmdzIiwic2NvcGVzZXRzIiwiYWxsIiwicGhhc2UiLCJPYmplY3QiLCJmcmVlemUiLCJmcm9tIiwiRXJyb3IiLCJuZXdzdHgiLCJzIiwiZnJvbU51bGwiLCJmcm9tTnVtYmVyIiwiZnJvbVN0cmluZyIsImZyb21QdW5jdHVhdG9yIiwiZnJvbUtleXdvcmQiLCJmcm9tSWRlbnRpZmllciIsImZyb21SZWd1bGFyRXhwcmVzc2lvbiIsInJlc29sdmUiLCJhbGxTY29wZXMiLCJzdHhTY29wZXMiLCJoYXMiLCJzY29wZSIsImxhc3QiLCJzY29wZXNldEJpbmRpbmdMaXN0IiwiYmlnZ2VzdEJpbmRpbmdQYWlyIiwiZmlsdGVyIiwiaXNTdWJzZXQiLCJzb3J0IiwiZGVidWdCYXNlIiwibWFwIiwidG9TdHJpbmciLCJqb2luIiwiZGVidWdBbWJpZ291c1Njb3Blc2V0cyIsImJpbmRpbmdTdHIiLCJiaW5kaW5nIiwiaXNKdXN0IiwiYWxpYXMiLCJnZXRPckVsc2UiLCJpdGVtcyIsImVsIiwidGV4dCIsImxpbmVOdW1iZXIiLCJzdGFydExvY2F0aW9uIiwibGluZSIsInNldExpbmVOdW1iZXIiLCJuZXdUb2siLCJrZXkiLCJrZXlzIiwiYWRkU2NvcGUiLCJvcHRpb25zIiwiZmxpcCIsIm1lcmdlIiwiaXQiLCJvbGRTY29wZXNldCIsIm5ld1Njb3Blc2V0IiwiaW5kZXgiLCJpbmRleE9mIiwicmVtb3ZlIiwic2V0IiwicmVtb3ZlU2NvcGUiLCJwaGFzZVNjb3Blc2V0IiwiYWxsU2NvcGVzZXQiLCJwaGFzZUluZGV4IiwiYWxsSW5kZXgiLCJSZWdFeHAiLCJ0ZXN0IiwiaXNJZGVudGlmaWVyIiwiaXNBc3NpZ24iLCJpc0Jvb2xlYW5MaXRlcmFsIiwiaXNLZXl3b3JkIiwiaXNOdWxsTGl0ZXJhbCIsImlzTnVtZXJpY0xpdGVyYWwiLCJpc1B1bmN0dWF0b3IiLCJpc1N0cmluZ0xpdGVyYWwiLCJpc1JlZ3VsYXJFeHByZXNzaW9uIiwiaXNUZW1wbGF0ZSIsImlzUGFyZW5zIiwiaXNCcmFjZXMiLCJpc0JyYWNrZXRzIiwiaXNTeW50YXhUZW1wbGF0ZSIsImlzRU9GIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7SUFBWUEsQzs7QUFDWjs7SUFBWUMsQzs7QUFFWjs7Ozs7O0FBMEJBLFNBQVNDLGFBQVQsQ0FBdUJDLEdBQXZC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QixFQUFrQ0MsSUFBbEMsQ0FBdUMsR0FBdkMsQ0FBUDtBQUNEO0FBQ0QsUUFBSSxLQUFLekYsS0FBTCxDQUFXLFFBQVgsQ0FBSixFQUEwQjtBQUN4QixhQUFPLE9BQU8sS0FBS1YsS0FBTCxDQUFXd0IsR0FBekI7QUFDRDtBQUNELFFBQUksS0FBS2QsS0FBTCxDQUFXLFVBQVgsQ0FBSixFQUE0QjtBQUMxQixhQUFPLEtBQUtvRCxHQUFMLEVBQVA7QUFDRDtBQUNELFdBQU8sS0FBSzlELEtBQUwsQ0FBV2UsS0FBbEI7QUFDRDtBQWhWeUI7a0JBQVBDLE0iLCJmaWxlIjoic3ludGF4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQGZsb3dcbmltcG9ydCB7IExpc3QsIE1hcCB9IGZyb20gJ2ltbXV0YWJsZSc7XG5pbXBvcnQgeyBhc3NlcnQgfSBmcm9tICcuL2Vycm9ycyc7XG5pbXBvcnQgQmluZGluZ01hcCBmcm9tICcuL2JpbmRpbmctbWFwJztcbmltcG9ydCB7IE1heWJlIH0gZnJvbSAncmFtZGEtZmFudGFzeSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ3JhbWRhJztcbmltcG9ydCAqIGFzIFQgZnJvbSAnc3dlZXQtc3BlYyc7XG5cbmltcG9ydCB7IFRva2VuVHlwZSwgVG9rZW5DbGFzcyB9IGZyb20gJy4vdG9rZW5zJztcblxudHlwZSBUb2tlbiA9IHtcbiAgdHlwZTogYW55O1xuICB2YWx1ZTogYW55O1xuICBzbGljZTogYW55O1xufTtcblxudHlwZSBUb2tlblRhZyA9XG4gICdudWxsJyB8XG4gICdudW1iZXInIHxcbiAgJ3N0cmluZycgfFxuICAncHVuY3R1YXRvcicgfFxuICAna2V5d29yZCcgfFxuICAnaWRlbnRpZmllcicgfFxuICAncmVndWxhckV4cHJlc3Npb24nIHxcbiAgJ2Jvb2xlYW4nIHxcbiAgJ2JyYWNlcycgfFxuICAncGFyZW5zJyB8XG4gICdkZWxpbWl0ZXInIHxcbiAgJ2VvZicgfFxuICAndGVtcGxhdGUnIHxcbiAgJ2Fzc2lnbicgfFxuICAnc3ludGF4VGVtcGxhdGUnIHxcbiAgJ2JyYWNrZXRzJ1xuXG5mdW5jdGlvbiBnZXRGaXJzdFNsaWNlKHN0eDogP1N5bnRheCkge1xuICBpZiAoKCFzdHgpIHx8IHR5cGVvZiBzdHguaXNEZWxpbWl0ZXIgIT09ICdmdW5jdGlvbicpIHJldHVybiBudWxsOyAvLyBUT0RPOiBzaG91bGQgbm90IGhhdmUgdG8gZG8gdGhpc1xuICBpZiAoIXN0eC5pc0RlbGltaXRlcigpKSB7XG4gICAgcmV0dXJuIHN0eC50b2tlbi5zbGljZTtcbiAgfVxuICByZXR1cm4gc3R4LnRva2VuLmdldCgwKS50b2tlbi5zbGljZTtcbn1cblxuZnVuY3Rpb24gc2l6ZURlY2VuZGluZyhhLCBiKSB7XG4gIGlmIChhLnNjb3Blcy5zaXplID4gYi5zY29wZXMuc2l6ZSkge1xuICAgIHJldHVybiAtMTtcbiAgfSBlbHNlIGlmIChiLnNjb3Blcy5zaXplID4gYS5zY29wZXMuc2l6ZSkge1xuICAgIHJldHVybiAxO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAwO1xuICB9XG59XG5cbnR5cGUgVHlwZXNIZWxwZXIgPSB7XG4gIFtrZXk6IFRva2VuVGFnXToge1xuICAgIG1hdGNoKHRva2VuOiBhbnkpOiBib29sZWFuO1xuICAgIGNyZWF0ZT86ICh2YWx1ZTogYW55LCBzdHg6ID9TeW50YXgpID0+IFN5bnRheDtcbiAgfVxufVxuXG5leHBvcnQgbGV0IFR5cGVzOiBUeXBlc0hlbHBlciA9IHtcbiAgbnVsbDoge1xuICAgIG1hdGNoOiB0b2tlbiA9PiAhVHlwZXMuZGVsaW1pdGVyLm1hdGNoKHRva2VuKSAmJiB0b2tlbi50eXBlID09PSBUb2tlblR5cGUuTlVMTCxcbiAgICBjcmVhdGU6ICh2YWx1ZSwgc3R4KSA9PiBuZXcgU3ludGF4KHtcbiAgICAgIHR5cGU6IFRva2VuVHlwZS5OVUxMLFxuICAgICAgdmFsdWU6IG51bGxcbiAgICB9LCBzdHgpXG4gIH0sXG4gIG51bWJlcjoge1xuICAgIG1hdGNoOiB0b2tlbiA9PiAhVHlwZXMuZGVsaW1pdGVyLm1hdGNoKHRva2VuKSAmJiB0b2tlbi50eXBlLmtsYXNzID09PSBUb2tlbkNsYXNzLk51bWVyaWNMaXRlcmFsLFxuICAgIGNyZWF0ZTogKHZhbHVlLCBzdHgpID0+IG5ldyBTeW50YXgoe1xuICAgICAgdHlwZTogVG9rZW5UeXBlLk5VTUJFUixcbiAgICAgIHZhbHVlXG4gICAgfSwgc3R4KVxuICB9LFxuICBzdHJpbmc6IHtcblx0XHRtYXRjaDogdG9rZW4gPT4gIVR5cGVzLmRlbGltaXRlci5tYXRjaCh0b2tlbikgJiYgdG9rZW4udHlwZS5rbGFzcyA9PT0gVG9rZW5DbGFzcy5TdHJpbmdMaXRlcmFsLFxuICAgIGNyZWF0ZTogKHZhbHVlLCBzdHgpID0+IG5ldyBTeW50YXgoe1xuICAgICAgdHlwZTogVG9rZW5UeXBlLlNUUklORyxcbiAgICAgIHN0cjogdmFsdWVcbiAgICB9LCBzdHgpXG4gIH0sXG4gIHB1bmN0dWF0b3I6IHtcblx0XHRtYXRjaDogdG9rZW4gPT4gIVR5cGVzLmRlbGltaXRlci5tYXRjaCh0b2tlbikgJiYgdG9rZW4udHlwZS5rbGFzcyA9PT0gVG9rZW5DbGFzcy5QdW5jdHVhdG9yLFxuICAgIGNyZWF0ZTogKHZhbHVlLCBzdHgpID0+IG5ldyBTeW50YXgoe1xuICAgICAgdHlwZToge1xuICAgICAgICBrbGFzczogVG9rZW5DbGFzcy5QdW5jdHVhdG9yLFxuICAgICAgICBuYW1lOiB2YWx1ZVxuICAgICAgfSxcbiAgICAgIHZhbHVlXG4gICAgfSwgc3R4KVxuICB9LFxuICBrZXl3b3JkOiB7XG5cdFx0bWF0Y2g6IHRva2VuID0+ICFUeXBlcy5kZWxpbWl0ZXIubWF0Y2godG9rZW4pICYmIHRva2VuLnR5cGUua2xhc3MgPT09IFRva2VuQ2xhc3MuS2V5d29yZCxcbiAgICBjcmVhdGU6ICh2YWx1ZSwgc3R4KSA9PiBuZXcgU3ludGF4KHtcbiAgICAgIHR5cGU6IHtcbiAgICAgICAga2xhc3M6IFRva2VuQ2xhc3MuS2V5d29yZCxcbiAgICAgICAgbmFtZTogdmFsdWVcbiAgICAgIH0sXG4gICAgICB2YWx1ZVxuICAgIH0sIHN0eClcbiAgfSxcbiAgaWRlbnRpZmllcjoge1xuXHRcdG1hdGNoOiB0b2tlbiA9PiAhVHlwZXMuZGVsaW1pdGVyLm1hdGNoKHRva2VuKSAmJiB0b2tlbi50eXBlLmtsYXNzID09PSBUb2tlbkNsYXNzLklkZW50LFxuICAgIGNyZWF0ZTogKHZhbHVlLCBzdHgpID0+IG5ldyBTeW50YXgoe1xuICAgICAgdHlwZTogVG9rZW5UeXBlLklERU5USUZJRVIsXG4gICAgICB2YWx1ZVxuICAgIH0sIHN0eClcbiAgfSxcbiAgcmVndWxhckV4cHJlc3Npb246IHtcblx0XHRtYXRjaDogdG9rZW4gPT4gIVR5cGVzLmRlbGltaXRlci5tYXRjaCh0b2tlbikgJiYgdG9rZW4udHlwZS5rbGFzcyA9PT0gVG9rZW5DbGFzcy5SZWd1bGFyRXhwcmVzc2lvbixcbiAgICBjcmVhdGU6ICh2YWx1ZSwgc3R4KSA9PiBuZXcgU3ludGF4KHtcbiAgICAgIHR5cGU6IFRva2VuVHlwZS5SRUdFWFAsXG4gICAgICB2YWx1ZVxuICAgIH0sIHN0eClcbiAgfSxcbiAgYnJhY2VzOiB7XG5cdFx0bWF0Y2g6IHRva2VuID0+IFR5cGVzLmRlbGltaXRlci5tYXRjaCh0b2tlbikgJiZcbiAgICAgICAgICAgdG9rZW4uZ2V0KDApLnRva2VuLnR5cGUgPT09IFRva2VuVHlwZS5MQlJBQ0UsXG4gICAgY3JlYXRlOiAoaW5uZXIsIHN0eCkgPT4ge1xuICAgICAgbGV0IGxlZnQgPSBuZXcgVC5SYXdTeW50YXgoe1xuICAgICAgICB2YWx1ZTogbmV3IFN5bnRheCh7XG4gICAgICAgICAgdHlwZTogVG9rZW5UeXBlLkxCUkFDRSxcbiAgICAgICAgICB2YWx1ZTogJ3snLFxuICAgICAgICAgIHNsaWNlOiBnZXRGaXJzdFNsaWNlKHN0eClcbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgICAgbGV0IHJpZ2h0ID0gbmV3IFQuUmF3U3ludGF4KHtcbiAgICAgICAgdmFsdWU6IG5ldyBTeW50YXgoe1xuICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5SQlJBQ0UsXG4gICAgICAgICAgdmFsdWU6ICd9JyxcbiAgICAgICAgICBzbGljZTogZ2V0Rmlyc3RTbGljZShzdHgpXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBuZXcgVC5SYXdEZWxpbWl0ZXIoe1xuICAgICAgICBraW5kOiAnYnJhY2VzJyxcbiAgICAgICAgaW5uZXI6IExpc3Qub2YobGVmdCkuY29uY2F0KGlubmVyKS5wdXNoKHJpZ2h0KVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBicmFja2V0czoge1xuXHRcdG1hdGNoOiB0b2tlbiA9PiBUeXBlcy5kZWxpbWl0ZXIubWF0Y2godG9rZW4pICYmXG4gICAgICAgICAgIHRva2VuLmdldCgwKS50b2tlbi50eXBlID09PSBUb2tlblR5cGUuTEJSQUNLLFxuICAgIGNyZWF0ZTogKGlubmVyLCBzdHgpID0+IHtcbiAgICAgIGxldCBsZWZ0ID0gbmV3IFQuUmF3U3ludGF4KHtcbiAgICAgICAgdmFsdWU6IG5ldyBTeW50YXgoe1xuICAgICAgICAgIHR5cGU6IFRva2VuVHlwZS5MQlJBQ0ssXG4gICAgICAgICAgdmFsdWU6ICdbJyxcbiAgICAgICAgICBzbGljZTogZ2V0Rmlyc3RTbGljZShzdHgpXG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICAgIGxldCByaWdodCA9IG5ldyBULlJhd1N5bnRheCh7XG4gICAgICAgIHZhbHVlOiBuZXcgU3ludGF4KHtcbiAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuUkJSQUNLLFxuICAgICAgICAgIHZhbHVlOiAnXScsXG4gICAgICAgICAgc2xpY2U6IGdldEZpcnN0U2xpY2Uoc3R4KVxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gbmV3IFQuUmF3RGVsaW1pdGVyKHtcbiAgICAgICAga2luZDogJ2JyYWNrZXRzJyxcbiAgICAgICAgaW5uZXI6IExpc3Qub2YobGVmdCkuY29uY2F0KGlubmVyKS5wdXNoKHJpZ2h0KVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBwYXJlbnM6IHtcblx0XHRtYXRjaDogdG9rZW4gPT4gVHlwZXMuZGVsaW1pdGVyLm1hdGNoKHRva2VuKSAmJlxuICAgICAgICAgICB0b2tlbi5nZXQoMCkudG9rZW4udHlwZSA9PT0gVG9rZW5UeXBlLkxQQVJFTixcbiAgICBjcmVhdGU6IChpbm5lciwgc3R4KSA9PiB7XG4gICAgICBsZXQgbGVmdCA9IG5ldyBULlJhd1N5bnRheCh7XG4gICAgICAgIHZhbHVlOiBuZXcgU3ludGF4KHtcbiAgICAgICAgICB0eXBlOiBUb2tlblR5cGUuTFBBUkVOLFxuICAgICAgICAgIHZhbHVlOiAnKCcsXG4gICAgICAgICAgc2xpY2U6IGdldEZpcnN0U2xpY2Uoc3R4KVxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICBsZXQgcmlnaHQgPSBuZXcgVC5SYXdTeW50YXgoe1xuICAgICAgICB2YWx1ZTogbmV3IFN5bnRheCh7XG4gICAgICAgICAgdHlwZTogVG9rZW5UeXBlLlJQQVJFTixcbiAgICAgICAgICB2YWx1ZTogJyknLFxuICAgICAgICAgIHNsaWNlOiBnZXRGaXJzdFNsaWNlKHN0eClcbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5ldyBULlJhd0RlbGltaXRlcih7XG4gICAgICAgIGtpbmQ6ICdwYXJlbnMnLFxuICAgICAgICBpbm5lcjogTGlzdC5vZihsZWZ0KS5jb25jYXQoaW5uZXIpLnB1c2gocmlnaHQpXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgYXNzaWduOiB7XG4gICAgbWF0Y2g6IHRva2VuID0+IHtcbiAgICAgIGlmIChUeXBlcy5wdW5jdHVhdG9yLm1hdGNoKHRva2VuKSkge1xuICAgICAgICBzd2l0Y2ggKHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgY2FzZSAnPSc6XG4gICAgICAgICAgY2FzZSAnfD0nOlxuICAgICAgICAgIGNhc2UgJ149JzpcbiAgICAgICAgICBjYXNlICcmPSc6XG4gICAgICAgICAgY2FzZSAnPDw9JzpcbiAgICAgICAgICBjYXNlICc+Pj0nOlxuICAgICAgICAgIGNhc2UgJz4+Pj0nOlxuICAgICAgICAgIGNhc2UgJys9JzpcbiAgICAgICAgICBjYXNlICctPSc6XG4gICAgICAgICAgY2FzZSAnKj0nOlxuICAgICAgICAgIGNhc2UgJy89JzpcbiAgICAgICAgICBjYXNlICclPSc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9LFxuXG4gIGJvb2xlYW46IHtcbiAgICBtYXRjaDogdG9rZW4gPT4gIVR5cGVzLmRlbGltaXRlci5tYXRjaCh0b2tlbikgJiYgdG9rZW4udHlwZSA9PT0gVG9rZW5UeXBlLlRSVUUgfHxcbiAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW5UeXBlLkZBTFNFXG4gIH0sXG5cbiAgdGVtcGxhdGU6IHtcbiAgICBtYXRjaDogdG9rZW4gPT4gIVR5cGVzLmRlbGltaXRlci5tYXRjaCh0b2tlbikgJiYgdG9rZW4udHlwZSA9PT0gVG9rZW5UeXBlLlRFTVBMQVRFXG4gIH0sXG5cbiAgZGVsaW1pdGVyOiB7XG4gICAgbWF0Y2g6IHRva2VuID0+IExpc3QuaXNMaXN0KHRva2VuKVxuICB9LFxuXG4gIHN5bnRheFRlbXBsYXRlOiB7XG4gICAgbWF0Y2g6IHRva2VuID0+IFR5cGVzLmRlbGltaXRlci5tYXRjaCh0b2tlbikgJiYgdG9rZW4uZ2V0KDApLnZhbCgpID09PSAnI2AnXG4gIH0sXG5cbiAgZW9mOiB7XG4gICAgbWF0Y2g6IHRva2VuID0+ICFUeXBlcy5kZWxpbWl0ZXIubWF0Y2godG9rZW4pICYmIHRva2VuLnR5cGUgPT09IFRva2VuVHlwZS5FT1NcbiAgfSxcbn07XG5leHBvcnQgY29uc3QgQUxMX1BIQVNFUyA9IHt9O1xuXG50eXBlIFNjb3Blc2V0ID0ge1xuICBhbGw6IExpc3Q8YW55PjtcbiAgcGhhc2U6IE1hcDxudW1iZXIgfCB7fSwgYW55Pjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3ludGF4IHtcbiAgLy8gdG9rZW46IFRva2VuIHwgTGlzdDxUb2tlbj47XG4gIHRva2VuOiBhbnk7XG4gIGJpbmRpbmdzOiBCaW5kaW5nTWFwO1xuICBzY29wZXNldHM6IFNjb3Blc2V0O1xuXG4gIGNvbnN0cnVjdG9yKHRva2VuOiBhbnksIG9sZHN0eDogP3sgYmluZGluZ3M6IGFueTsgc2NvcGVzZXRzOiBhbnl9KSB7XG4gICAgdGhpcy50b2tlbiA9IHRva2VuO1xuICAgIHRoaXMuYmluZGluZ3MgPSBvbGRzdHggJiYgKG9sZHN0eC5iaW5kaW5ncyAhPSBudWxsKSA/IG9sZHN0eC5iaW5kaW5ncyA6IG5ldyBCaW5kaW5nTWFwKCk7XG4gICAgdGhpcy5zY29wZXNldHMgPSBvbGRzdHggJiYgKG9sZHN0eC5zY29wZXNldHMgIT0gbnVsbCkgPyBvbGRzdHguc2NvcGVzZXRzIDoge1xuICAgICAgYWxsOiBMaXN0KCksXG4gICAgICBwaGFzZTogTWFwKClcbiAgICB9O1xuICAgIE9iamVjdC5mcmVlemUodGhpcyk7XG4gIH1cblxuICBzdGF0aWMgb2YodG9rZW46IFRva2VuLCBzdHg6ID9TeW50YXgpIHtcbiAgICByZXR1cm4gbmV3IFN5bnRheCh0b2tlbiwgc3R4KTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tKHR5cGUsIHZhbHVlLCBzdHg6ID9TeW50YXgpIHtcbiAgICBpZiAoIVR5cGVzW3R5cGVdKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodHlwZSArICcgaXMgbm90IGEgdmFsaWQgdHlwZScpO1xuICAgIH1cbiAgICBlbHNlIGlmICghVHlwZXNbdHlwZV0uY3JlYXRlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBjcmVhdGUgYSBzeW50YXggZnJvbSB0eXBlICcgKyB0eXBlKTtcbiAgICB9XG4gICAgbGV0IG5ld3N0eCA9IFR5cGVzW3R5cGVdLmNyZWF0ZSh2YWx1ZSwgc3R4KTtcbiAgICBsZXQgc2xpY2UgPSBnZXRGaXJzdFNsaWNlKHN0eCk7XG4gICAgaWYgKHNsaWNlICE9IG51bGwgJiYgbmV3c3R4LnRva2VuICE9IG51bGwpIHtcbiAgICAgIG5ld3N0eC50b2tlbi5zbGljZSA9IHNsaWNlO1xuICAgIH1cbiAgICByZXR1cm4gbmV3c3R4O1xuICB9XG5cbiAgZnJvbSh0eXBlOiBUb2tlblRhZywgdmFsdWU6IGFueSkge1xuICAgIC8vIFRPRE86IHRoaXMgaXMgZ3Jvc3MsIGZpeFxuICAgIGxldCBzID0gU3ludGF4LmZyb20odHlwZSwgdmFsdWUsIHRoaXMpO1xuICAgIGlmIChzIGluc3RhbmNlb2YgU3ludGF4KSB7XG4gICAgICByZXR1cm4gbmV3IFQuUmF3U3ludGF4KHsgdmFsdWU6IHMgfSk7XG4gICAgfVxuICAgIHJldHVybiBzO1xuICB9XG5cbiAgZnJvbU51bGwoKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbSgnbnVsbCcsIG51bGwpO1xuICB9XG5cbiAgZnJvbU51bWJlcih2YWx1ZTogbnVtYmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbSgnbnVtYmVyJywgdmFsdWUpO1xuICB9XG5cbiAgZnJvbVN0cmluZyh2YWx1ZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbSgnc3RyaW5nJywgdmFsdWUpO1xuICB9XG5cbiAgZnJvbVB1bmN0dWF0b3IodmFsdWU6IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLmZyb20oJ3B1bmN0dWF0b3InLCB2YWx1ZSk7XG4gIH1cblxuICBmcm9tS2V5d29yZCh2YWx1ZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbSgna2V5d29yZCcsIHZhbHVlKTtcbiAgfVxuXG4gIGZyb21JZGVudGlmaWVyKHZhbHVlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5mcm9tKCdpZGVudGlmaWVyJywgdmFsdWUpO1xuICB9XG5cbiAgZnJvbVJlZ3VsYXJFeHByZXNzaW9uKHZhbHVlOiBhbnkpIHtcbiAgICByZXR1cm4gdGhpcy5mcm9tKCdyZWd1bGFyRXhwcmVzc2lvbicsIHZhbHVlKTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tTnVsbChzdHg6IFN5bnRheCkge1xuICAgIHJldHVybiBTeW50YXguZnJvbSgnbnVsbCcsIG51bGwsIHN0eCk7XG4gIH1cblxuICBzdGF0aWMgZnJvbU51bWJlcih2YWx1ZSwgc3R4KSB7XG4gICAgcmV0dXJuIFN5bnRheC5mcm9tKCdudW1iZXInLCB2YWx1ZSwgc3R4KTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tU3RyaW5nKHZhbHVlLCBzdHgpIHtcbiAgICByZXR1cm4gU3ludGF4LmZyb20oJ3N0cmluZycsIHZhbHVlLCBzdHgpO1xuICB9XG5cbiAgc3RhdGljIGZyb21QdW5jdHVhdG9yKHZhbHVlLCBzdHgpIHtcbiAgICByZXR1cm4gU3ludGF4LmZyb20oJ3B1bmN0dWF0b3InLCB2YWx1ZSwgc3R4KTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tS2V5d29yZCh2YWx1ZSwgc3R4KSB7XG4gICAgcmV0dXJuIFN5bnRheC5mcm9tKCdrZXl3b3JkJywgdmFsdWUsIHN0eCk7XG4gIH1cblxuICBzdGF0aWMgZnJvbUlkZW50aWZpZXIodmFsdWUsIHN0eCkge1xuICAgIHJldHVybiBTeW50YXguZnJvbSgnaWRlbnRpZmllcicsIHZhbHVlLCBzdHgpO1xuICB9XG5cbiAgc3RhdGljIGZyb21SZWd1bGFyRXhwcmVzc2lvbih2YWx1ZSwgc3R4KSB7XG4gICAgcmV0dXJuIFN5bnRheC5mcm9tKCdyZWd1bGFyRXhwcmVzc2lvbicsIHZhbHVlLCBzdHgpO1xuICB9XG5cbiAgLy8gKCkgLT4gc3RyaW5nXG4gIHJlc29sdmUocGhhc2U6IGFueSkge1xuICAgIGFzc2VydChwaGFzZSAhPSBudWxsLCAnbXVzdCBwcm92aWRlIGEgcGhhc2UgdG8gcmVzb2x2ZScpO1xuICAgIGxldCBhbGxTY29wZXMgPSB0aGlzLnNjb3Blc2V0cy5hbGw7XG4gICAgbGV0IHN0eFNjb3BlcyA9IHRoaXMuc2NvcGVzZXRzLnBoYXNlLmhhcyhwaGFzZSkgPyB0aGlzLnNjb3Blc2V0cy5waGFzZS5nZXQocGhhc2UpIDogTGlzdCgpO1xuICAgIHN0eFNjb3BlcyA9IGFsbFNjb3Blcy5jb25jYXQoc3R4U2NvcGVzKTtcbiAgICBpZiAoc3R4U2NvcGVzLnNpemUgPT09IDAgfHwgISh0aGlzLm1hdGNoKCdpZGVudGlmaWVyJykgfHwgdGhpcy5tYXRjaCgna2V5d29yZCcpKSkge1xuICAgICAgcmV0dXJuIHRoaXMudG9rZW4udmFsdWU7XG4gICAgfVxuICAgIGxldCBzY29wZSA9IHN0eFNjb3Blcy5sYXN0KCk7XG4gICAgbGV0IGJpbmRpbmdzID0gdGhpcy5iaW5kaW5ncztcbiAgICBpZiAoc2NvcGUpIHtcbiAgICAgIC8vIExpc3Q8eyBzY29wZXM6IExpc3Q8U2NvcGU+LCBiaW5kaW5nOiBTeW1ib2wgfT5cbiAgICAgIGxldCBzY29wZXNldEJpbmRpbmdMaXN0ID0gYmluZGluZ3MuZ2V0KHRoaXMpO1xuXG4gICAgICBpZiAoc2NvcGVzZXRCaW5kaW5nTGlzdCkge1xuICAgICAgICAvLyB7IHNjb3BlczogTGlzdDxTY29wZT4sIGJpbmRpbmc6IFN5bWJvbCB9XG4gICAgICAgIGxldCBiaWdnZXN0QmluZGluZ1BhaXIgPSBzY29wZXNldEJpbmRpbmdMaXN0LmZpbHRlcigoe3Njb3Blc30pID0+IHtcbiAgICAgICAgICByZXR1cm4gc2NvcGVzLmlzU3Vic2V0KHN0eFNjb3Blcyk7XG4gICAgICAgIH0pLnNvcnQoc2l6ZURlY2VuZGluZyk7XG5cbiAgICAgICAgaWYgKGJpZ2dlc3RCaW5kaW5nUGFpci5zaXplID49IDIgJiZcbiAgICAgICAgICAgIGJpZ2dlc3RCaW5kaW5nUGFpci5nZXQoMCkuc2NvcGVzLnNpemUgPT09IGJpZ2dlc3RCaW5kaW5nUGFpci5nZXQoMSkuc2NvcGVzLnNpemUpIHtcbiAgICAgICAgICBsZXQgZGVidWdCYXNlID0gJ3snICsgc3R4U2NvcGVzLm1hcChzID0+IHMudG9TdHJpbmcoKSkuam9pbignLCAnKSArICd9JztcbiAgICAgICAgICBsZXQgZGVidWdBbWJpZ291c1Njb3Blc2V0cyA9IGJpZ2dlc3RCaW5kaW5nUGFpci5tYXAoKHtzY29wZXN9KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gJ3snICsgc2NvcGVzLm1hcChzID0+IHMudG9TdHJpbmcoKSkuam9pbignLCAnKSArICd9JztcbiAgICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2NvcGVzZXQgJyArIGRlYnVnQmFzZSArICcgaGFzIGFtYmlndW91cyBzdWJzZXRzICcgKyBkZWJ1Z0FtYmlnb3VzU2NvcGVzZXRzKTtcbiAgICAgICAgfSBlbHNlIGlmIChiaWdnZXN0QmluZGluZ1BhaXIuc2l6ZSAhPT0gMCkge1xuICAgICAgICAgIGxldCBiaW5kaW5nU3RyID0gYmlnZ2VzdEJpbmRpbmdQYWlyLmdldCgwKS5iaW5kaW5nLnRvU3RyaW5nKCk7XG4gICAgICAgICAgaWYgKE1heWJlLmlzSnVzdChiaWdnZXN0QmluZGluZ1BhaXIuZ2V0KDApLmFsaWFzKSkge1xuICAgICAgICAgICAgLy8gbnVsbCBuZXZlciBoYXBwZW5zIGJlY2F1c2Ugd2UganVzdCBjaGVja2VkIGlmIGl0IGlzIGEgSnVzdFxuICAgICAgICAgICAgcmV0dXJuIGJpZ2dlc3RCaW5kaW5nUGFpci5nZXQoMCkuYWxpYXMuZ2V0T3JFbHNlKG51bGwpLnJlc29sdmUocGhhc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gYmluZGluZ1N0cjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy50b2tlbi52YWx1ZTtcbiAgfVxuXG4gIHZhbCgpOiBhbnkge1xuICAgIGFzc2VydCghdGhpcy5tYXRjaCgnZGVsaW1pdGVyJyksICdjYW5ub3QgZ2V0IHRoZSB2YWwgb2YgYSBkZWxpbWl0ZXInKTtcbiAgICBpZiAodGhpcy5tYXRjaCgnc3RyaW5nJykpIHtcbiAgICAgIHJldHVybiB0aGlzLnRva2VuLnN0cjtcbiAgICB9XG4gICAgaWYgKHRoaXMubWF0Y2goJ3RlbXBsYXRlJykpIHtcbiAgICAgIGlmICghdGhpcy50b2tlbi5pdGVtcykgcmV0dXJuIHRoaXMudG9rZW4udmFsdWU7XG4gICAgICByZXR1cm4gdGhpcy50b2tlbi5pdGVtcy5tYXAoZWwgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGVsLm1hdGNoID09PSAnZnVuY3Rpb24nICYmIGVsLm1hdGNoKCdkZWxpbWl0ZXInKSkge1xuICAgICAgICAgIHJldHVybiAnJHsuLi59JztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWwuc2xpY2UudGV4dDtcbiAgICAgIH0pLmpvaW4oJycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy50b2tlbi52YWx1ZTtcbiAgfVxuXG4gIGxpbmVOdW1iZXIoKSB7XG4gICAgaWYgKCF0aGlzLm1hdGNoKCdkZWxpbWl0ZXInKSkge1xuICAgICAgcmV0dXJuIHRoaXMudG9rZW4uc2xpY2Uuc3RhcnRMb2NhdGlvbi5saW5lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy50b2tlbi5nZXQoMCkubGluZU51bWJlcigpO1xuICAgIH1cbiAgfVxuXG4gIHNldExpbmVOdW1iZXIobGluZTogbnVtYmVyKSB7XG4gICAgbGV0IG5ld1RvayA9IHt9O1xuICAgIGlmICh0aGlzLmlzRGVsaW1pdGVyKCkpIHtcbiAgICAgIG5ld1RvayA9IHRoaXMudG9rZW4ubWFwKHMgPT4gcy5zZXRMaW5lTnVtYmVyKGxpbmUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKHRoaXMudG9rZW4pKSB7XG4gICAgICAgIG5ld1Rva1trZXldID0gdGhpcy50b2tlbltrZXldO1xuICAgICAgfVxuICAgICAgYXNzZXJ0KG5ld1Rvay5zbGljZSAmJiBuZXdUb2suc2xpY2Uuc3RhcnRMb2NhdGlvbiwgJ2FsbCB0b2tlbnMgbXVzdCBoYXZlIGxpbmUgaW5mbycpO1xuICAgICAgbmV3VG9rLnNsaWNlLnN0YXJ0TG9jYXRpb24ubGluZSA9IGxpbmU7XG4gICAgfVxuICAgIHJldHVybiBuZXcgU3ludGF4KG5ld1RvaywgdGhpcyk7XG4gIH1cblxuICAvLyAoKSAtPiBMaXN0PFN5bnRheD5cbiAgLy8gaW5uZXIoKSB7XG4gIC8vICAgYXNzZXJ0KHRoaXMubWF0Y2goXCJkZWxpbWl0ZXJcIiksIFwiY2FuIG9ubHkgZ2V0IHRoZSBpbm5lciBvZiBhIGRlbGltaXRlclwiKTtcbiAgLy8gICByZXR1cm4gdGhpcy50b2tlbi5zbGljZSgxLCB0aGlzLnRva2VuLnNpemUgLSAxKTtcbiAgLy8gfVxuXG4gIGFkZFNjb3BlKHNjb3BlOiBhbnksIGJpbmRpbmdzOiBhbnksIHBoYXNlOiBudW1iZXIgfCB7fSwgb3B0aW9uczogYW55ID0geyBmbGlwOiBmYWxzZSB9KSB7XG4gICAgbGV0IHRva2VuID0gdGhpcy5tYXRjaCgnZGVsaW1pdGVyJykgPyB0aGlzLnRva2VuLm1hcChzID0+IHMuYWRkU2NvcGUoc2NvcGUsIGJpbmRpbmdzLCBwaGFzZSwgb3B0aW9ucykpIDogdGhpcy50b2tlbjtcbiAgICBpZiAodGhpcy5tYXRjaCgndGVtcGxhdGUnKSkge1xuICAgICAgdG9rZW4gPSBfLm1lcmdlKHRva2VuLCB7XG4gICAgICAgIGl0ZW1zOiB0b2tlbi5pdGVtcy5tYXAoaXQgPT4ge1xuICAgICAgICAgIGlmIChpdCBpbnN0YW5jZW9mIFN5bnRheCAmJiBpdC5tYXRjaCgnZGVsaW1pdGVyJykpIHtcbiAgICAgICAgICAgIHJldHVybiBpdC5hZGRTY29wZShzY29wZSwgYmluZGluZ3MsIHBoYXNlLCBvcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGl0O1xuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgfVxuICAgIGxldCBvbGRTY29wZXNldDtcbiAgICBpZiAocGhhc2UgPT09IEFMTF9QSEFTRVMpIHtcbiAgICAgIG9sZFNjb3Blc2V0ID0gdGhpcy5zY29wZXNldHMuYWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBvbGRTY29wZXNldCA9IHRoaXMuc2NvcGVzZXRzLnBoYXNlLmhhcyhwaGFzZSkgPyB0aGlzLnNjb3Blc2V0cy5waGFzZS5nZXQocGhhc2UpIDogTGlzdCgpO1xuICAgIH1cbiAgICBsZXQgbmV3U2NvcGVzZXQ7XG4gICAgaWYgKG9wdGlvbnMuZmxpcCkge1xuICAgICAgbGV0IGluZGV4ID0gb2xkU2NvcGVzZXQuaW5kZXhPZihzY29wZSk7XG4gICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIG5ld1Njb3Blc2V0ID0gb2xkU2NvcGVzZXQucmVtb3ZlKGluZGV4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld1Njb3Blc2V0ID0gb2xkU2NvcGVzZXQucHVzaChzY29wZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ld1Njb3Blc2V0ID0gb2xkU2NvcGVzZXQucHVzaChzY29wZSk7XG4gICAgfVxuICAgIGxldCBuZXdzdHggPSB7XG4gICAgICBiaW5kaW5ncyxcbiAgICAgIHNjb3Blc2V0czoge1xuICAgICAgICBhbGw6IHRoaXMuc2NvcGVzZXRzLmFsbCxcbiAgICAgICAgcGhhc2U6IHRoaXMuc2NvcGVzZXRzLnBoYXNlXG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChwaGFzZSA9PT0gQUxMX1BIQVNFUykge1xuICAgICAgbmV3c3R4LnNjb3Blc2V0cy5hbGwgPSBuZXdTY29wZXNldDtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV3c3R4LnNjb3Blc2V0cy5waGFzZSA9IG5ld3N0eC5zY29wZXNldHMucGhhc2Uuc2V0KHBoYXNlLCBuZXdTY29wZXNldCk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgU3ludGF4KHRva2VuLCBuZXdzdHgpO1xuICB9XG5cbiAgcmVtb3ZlU2NvcGUoc2NvcGU6IGFueSwgcGhhc2U6IG51bWJlcikge1xuICAgIGxldCB0b2tlbiA9IHRoaXMubWF0Y2goJ2RlbGltaXRlcicpID8gdGhpcy50b2tlbi5tYXAocyA9PiBzLnJlbW92ZVNjb3BlKHNjb3BlLCBwaGFzZSkpIDogdGhpcy50b2tlbjtcbiAgICBsZXQgcGhhc2VTY29wZXNldCA9IHRoaXMuc2NvcGVzZXRzLnBoYXNlLmhhcyhwaGFzZSkgPyB0aGlzLnNjb3Blc2V0cy5waGFzZS5nZXQocGhhc2UpIDogTGlzdCgpO1xuICAgIGxldCBhbGxTY29wZXNldCA9IHRoaXMuc2NvcGVzZXRzLmFsbDtcbiAgICBsZXQgbmV3c3R4ID0ge1xuICAgICAgYmluZGluZ3M6IHRoaXMuYmluZGluZ3MsXG4gICAgICBzY29wZXNldHM6IHtcbiAgICAgICAgYWxsOiB0aGlzLnNjb3Blc2V0cy5hbGwsXG4gICAgICAgIHBoYXNlOiB0aGlzLnNjb3Blc2V0cy5waGFzZVxuICAgICAgfVxuICAgIH07XG5cbiAgICBsZXQgcGhhc2VJbmRleCA9IHBoYXNlU2NvcGVzZXQuaW5kZXhPZihzY29wZSk7XG4gICAgbGV0IGFsbEluZGV4ID0gYWxsU2NvcGVzZXQuaW5kZXhPZihzY29wZSk7XG4gICAgaWYgKHBoYXNlSW5kZXggIT09IC0xKSB7XG4gICAgICBuZXdzdHguc2NvcGVzZXRzLnBoYXNlID0gdGhpcy5zY29wZXNldHMucGhhc2Uuc2V0KHBoYXNlLCBwaGFzZVNjb3Blc2V0LnJlbW92ZShwaGFzZUluZGV4KSk7XG4gICAgfSBlbHNlIGlmIChhbGxJbmRleCAhPT0gLTEpIHtcbiAgICAgIG5ld3N0eC5zY29wZXNldHMuYWxsID0gYWxsU2NvcGVzZXQucmVtb3ZlKGFsbEluZGV4KTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBTeW50YXgodG9rZW4sIG5ld3N0eCk7XG4gIH1cblxuICBtYXRjaCh0eXBlOiBUb2tlblRhZywgdmFsdWU6IGFueSkge1xuICAgIGlmICghVHlwZXNbdHlwZV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcih0eXBlICsgJyBpcyBhbiBpbnZhbGlkIHR5cGUnKTtcbiAgICB9XG4gICAgcmV0dXJuIFR5cGVzW3R5cGVdLm1hdGNoKHRoaXMudG9rZW4pICYmICh2YWx1ZSA9PSBudWxsIHx8XG4gICAgICAodmFsdWUgaW5zdGFuY2VvZiBSZWdFeHAgPyB2YWx1ZS50ZXN0KHRoaXMudmFsKCkpIDogdGhpcy52YWwoKSA9PSB2YWx1ZSkpO1xuICB9XG5cbiAgaXNJZGVudGlmaWVyKHZhbHVlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5tYXRjaCgnaWRlbnRpZmllcicsIHZhbHVlKTtcbiAgfVxuXG4gIGlzQXNzaWduKHZhbHVlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5tYXRjaCgnYXNzaWduJywgdmFsdWUpO1xuICB9XG5cbiAgaXNCb29sZWFuTGl0ZXJhbCh2YWx1ZTogYm9vbGVhbikge1xuICAgIHJldHVybiB0aGlzLm1hdGNoKCdib29sZWFuJywgdmFsdWUpO1xuICB9XG5cbiAgaXNLZXl3b3JkKHZhbHVlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5tYXRjaCgna2V5d29yZCcsIHZhbHVlKTtcbiAgfVxuXG4gIGlzTnVsbExpdGVyYWwodmFsdWU6IGFueSkge1xuICAgIHJldHVybiB0aGlzLm1hdGNoKCdudWxsJywgdmFsdWUpO1xuICB9XG5cbiAgaXNOdW1lcmljTGl0ZXJhbCh2YWx1ZTogbnVtYmVyKSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2goJ251bWJlcicsIHZhbHVlKTtcbiAgfVxuXG4gIGlzUHVuY3R1YXRvcih2YWx1ZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2goJ3B1bmN0dWF0b3InLCB2YWx1ZSk7XG4gIH1cblxuICBpc1N0cmluZ0xpdGVyYWwodmFsdWU6IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLm1hdGNoKCdzdHJpbmcnLCB2YWx1ZSk7XG4gIH1cblxuICBpc1JlZ3VsYXJFeHByZXNzaW9uKHZhbHVlOiBhbnkpIHtcbiAgICByZXR1cm4gdGhpcy5tYXRjaCgncmVndWxhckV4cHJlc3Npb24nLCB2YWx1ZSk7XG4gIH1cblxuICBpc1RlbXBsYXRlKHZhbHVlOiBhbnkpIHtcbiAgICByZXR1cm4gdGhpcy5tYXRjaCgndGVtcGxhdGUnLCB2YWx1ZSk7XG4gIH1cblxuICBpc0RlbGltaXRlcih2YWx1ZTogYW55KSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2goJ2RlbGltaXRlcicsIHZhbHVlKTtcbiAgfVxuXG4gIGlzUGFyZW5zKHZhbHVlOiBhbnkpIHtcbiAgICByZXR1cm4gdGhpcy5tYXRjaCgncGFyZW5zJywgdmFsdWUpO1xuICB9XG5cbiAgaXNCcmFjZXModmFsdWU6IGFueSkge1xuICAgIHJldHVybiB0aGlzLm1hdGNoKCdicmFjZXMnLCB2YWx1ZSk7XG4gIH1cblxuICBpc0JyYWNrZXRzKHZhbHVlOiBhbnkpIHtcbiAgICByZXR1cm4gdGhpcy5tYXRjaCgnYnJhY2tldHMnLCB2YWx1ZSk7XG4gIH1cblxuICBpc1N5bnRheFRlbXBsYXRlKHZhbHVlOiBhbnkpIHtcbiAgICByZXR1cm4gdGhpcy5tYXRjaCgnc3ludGF4VGVtcGxhdGUnLCB2YWx1ZSk7XG4gIH1cblxuICBpc0VPRih2YWx1ZTogYW55KSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2goJ2VvZicsIHZhbHVlKTtcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIGlmICh0aGlzLm1hdGNoKCdkZWxpbWl0ZXInKSkge1xuICAgICAgcmV0dXJuIHRoaXMudG9rZW4ubWFwKHMgPT4gcy50b1N0cmluZygpKS5qb2luKCcgJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLm1hdGNoKCdzdHJpbmcnKSkge1xuICAgICAgcmV0dXJuICdcXCcnICsgdGhpcy50b2tlbi5zdHI7XG4gICAgfVxuICAgIGlmICh0aGlzLm1hdGNoKCd0ZW1wbGF0ZScpKSB7XG4gICAgICByZXR1cm4gdGhpcy52YWwoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudG9rZW4udmFsdWU7XG4gIH1cbn1cbiJdfQ==