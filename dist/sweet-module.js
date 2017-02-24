'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sweetSpec = require('sweet-spec');

var T = _interopRequireWildcard(_sweetSpec);

var _ramda = require('ramda');

var _ = _interopRequireWildcard(_ramda);

var _sweetSpecUtils = require('./sweet-spec-utils');

var S = _interopRequireWildcard(_sweetSpecUtils);

var _codegen = require('./codegen');

var _codegen2 = _interopRequireDefault(_codegen);

var _immutable = require('immutable');

var _sweetToShiftReducer = require('./sweet-to-shift-reducer.js');

var _sweetToShiftReducer2 = _interopRequireDefault(_sweetToShiftReducer);

var _syntax = require('./syntax');

var _syntax2 = _interopRequireDefault(_syntax);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

const extractDeclaration = _.cond([[S.isExport, _.prop('declaration')], [S.isExportDefault, _.prop('body')], [_.T, term => {
  throw new Error(`Expecting an Export or ExportDefault but got ${ term }`);
}]]);


const ExpSpec = x => ({ exportedName: x });

const extractDeclarationNames = _.cond([[S.isVariableDeclarator, ({ binding }) => _immutable.List.of(ExpSpec(binding.name))], [S.isVariableDeclaration, ({ declarators }) => declarators.flatMap(extractDeclarationNames)], [S.isFunctionDeclaration, ({ name }) => _immutable.List.of(ExpSpec(name.name))], [S.isClassDeclaration, ({ name }) => _immutable.List.of(ExpSpec(name.name))]]);

function extractNames(term) {
  if (S.isExport(term)) {
    return extractDeclarationNames(term.declaration);
  } else if (S.isExportDefault(term)) {
    return (0, _immutable.List)();
  } else if (S.isExportFrom(term)) {
    return term.namedExports;
  }
  throw new Error(`Unknown export type`);
}

function wrapStatement(declaration) {
  if (S.isVariableDeclaration(declaration)) {
    return new T.VariableDeclarationStatement({ declaration });
  }
  return declaration;
}

const memoSym = Symbol('memo');

function makeVarDeclStmt(name, expr) {
  return new T.VariableDeclarationStatement({
    declaration: new T.VariableDeclaration({
      kind: 'var',
      declarators: _immutable.List.of(new T.VariableDeclarator({
        binding: name,
        init: expr
      }))
    })
  });
}

class SweetModule {

  constructor(items) {
    let body = [];
    let imports = [];
    let exports = [];
    this.exportedNames = (0, _immutable.List)();
    for (let item of items) {
      if (S.isImportDeclaration(item)) {
        imports.push(item);
      } else if (S.isExportDeclaration(item)) {
        exports.push(item);
        this.exportedNames = this.exportedNames.concat(extractNames(item));
        if (S.isExport(item)) {
          body.push(wrapStatement(extractDeclaration(item)));
        } else if (S.isExportDefault(item)) {
          let decl = extractDeclaration(item);
          let defStx = _syntax2.default.fromIdentifier('_default');
          let def = new T.BindingIdentifier({
            name: defStx
          });
          this.exportedNames = this.exportedNames.push(ExpSpec(defStx));
          if (S.isFunctionDeclaration(decl) || S.isClassDeclaration(decl)) {
            body.push(decl);
            // extract name and bind it to _default
            body.push(makeVarDeclStmt(def, new T.IdentifierExpression({ name: decl.name.name })));
          } else {
            // expression so bind it to _default
            body.push(makeVarDeclStmt(def, decl));
          }
        }
      } else {
        body.push(item);
      }
    }
    this.items = (0, _immutable.List)(body);
    this.imports = (0, _immutable.List)(imports);
    this.exports = (0, _immutable.List)(exports);
  }

  // $FlowFixMe: flow doesn't support computed property keys yet
  [memoSym]() {
    let runtime = [],
        compiletime = [];
    for (let item of this.items) {
      if (S.isCompiletimeStatement(item)) {
        compiletime.push(item);
      } else {
        runtime.push(item);
      }
    }
    this.runtime = (0, _immutable.List)(runtime);
    this.compiletime = (0, _immutable.List)(compiletime);
  }

  runtimeItems() {
    if (this.runtime == null) {
      // $FlowFixMe: flow doesn't support computed property keys yet
      this[memoSym]();
    }
    return this.runtime;
  }

  compiletimeItems() {
    if (this.compiletime == null) {
      // $FlowFixMe: flow doesn't support computed property keys yet
      this[memoSym]();
    }
    return this.compiletime;
  }

  parse() {
    return new T.Module({
      items: this.items,
      directives: (0, _immutable.List)()
    }).reduce(new _sweetToShiftReducer2.default(0));
  }

  codegen() {
    return (0, _codegen2.default)(this.parse()).code;
  }
}
exports.default = SweetModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zd2VldC1tb2R1bGUuanMiXSwibmFtZXMiOlsiVCIsIl8iLCJTIiwiZXh0cmFjdERlY2xhcmF0aW9uIiwiY29uZCIsImlzRXhwb3J0IiwicHJvcCIsImlzRXhwb3J0RGVmYXVsdCIsInRlcm0iLCJFcnJvciIsIkV4cFNwZWMiLCJ4IiwiZXhwb3J0ZWROYW1lIiwiZXh0cmFjdERlY2xhcmF0aW9uTmFtZXMiLCJpc1ZhcmlhYmxlRGVjbGFyYXRvciIsImJpbmRpbmciLCJvZiIsIm5hbWUiLCJpc1ZhcmlhYmxlRGVjbGFyYXRpb24iLCJkZWNsYXJhdG9ycyIsImZsYXRNYXAiLCJpc0Z1bmN0aW9uRGVjbGFyYXRpb24iLCJpc0NsYXNzRGVjbGFyYXRpb24iLCJleHRyYWN0TmFtZXMiLCJkZWNsYXJhdGlvbiIsImlzRXhwb3J0RnJvbSIsIm5hbWVkRXhwb3J0cyIsIndyYXBTdGF0ZW1lbnQiLCJWYXJpYWJsZURlY2xhcmF0aW9uU3RhdGVtZW50IiwibWVtb1N5bSIsIlN5bWJvbCIsIm1ha2VWYXJEZWNsU3RtdCIsImV4cHIiLCJWYXJpYWJsZURlY2xhcmF0aW9uIiwia2luZCIsIlZhcmlhYmxlRGVjbGFyYXRvciIsImluaXQiLCJTd2VldE1vZHVsZSIsImNvbnN0cnVjdG9yIiwiaXRlbXMiLCJib2R5IiwiaW1wb3J0cyIsImV4cG9ydHMiLCJleHBvcnRlZE5hbWVzIiwiaXRlbSIsImlzSW1wb3J0RGVjbGFyYXRpb24iLCJwdXNoIiwiaXNFeHBvcnREZWNsYXJhdGlvbiIsImNvbmNhdCIsImRlY2wiLCJkZWZTdHgiLCJmcm9tSWRlbnRpZmllciIsImRlZiIsIkJpbmRpbmdJZGVudGlmaWVyIiwiSWRlbnRpZmllckV4cHJlc3Npb24iLCJydW50aW1lIiwiY29tcGlsZXRpbWUiLCJpc0NvbXBpbGV0aW1lU3RhdGVtZW50IiwicnVudGltZUl0ZW1zIiwiY29tcGlsZXRpbWVJdGVtcyIsInBhcnNlIiwiTW9kdWxlIiwiZGlyZWN0aXZlcyIsInJlZHVj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SzJCLFdBQVo7QUFDRDs7QUFFREksVUFBUTtBQUNOLFdBQU8sSUFBSTVELEVBQUU2RCxNQUFOLENBQWE7QUFDbEJ0QixhQUFPLEtBQUtBLEtBRE07QUFFbEJ1QixrQkFBWTtBQUZNLEtBQWIsRUFHSkMsTUFISSxDQUdHLGtDQUF3QixDQUF4QixDQUhILENBQVA7QUFJRDs7QUFFREMsWUFBVTtBQUNSLFdBQU8sdUJBQVEsS0FBS0osS0FBTCxFQUFSLEVBQXNCSyxJQUE3QjtBQUNEO0FBdEY4QjtrQkFBWjVCLFciLCJmaWxlIjoic3dlZXQtbW9kdWxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQGZsb3dcbmltcG9ydCAqIGFzIFQgZnJvbSAnc3dlZXQtc3BlYyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ3JhbWRhJztcbmltcG9ydCAqIGFzIFMgZnJvbSAnLi9zd2VldC1zcGVjLXV0aWxzJztcbmltcG9ydCBjb2RlZ2VuIGZyb20gJy4vY29kZWdlbic7XG5pbXBvcnQgeyBMaXN0IH0gZnJvbSAnaW1tdXRhYmxlJztcbmltcG9ydCBTd2VldFRvU2hpZnRSZWR1Y2VyIGZyb20gJy4vc3dlZXQtdG8tc2hpZnQtcmVkdWNlci5qcyc7XG5pbXBvcnQgU3ludGF4IGZyb20gJy4vc3ludGF4JztcblxuY29uc3QgZXh0cmFjdERlY2xhcmF0aW9uID0gXy5jb25kKFtcbiAgW1MuaXNFeHBvcnQsICAgICAgICBfLnByb3AoJ2RlY2xhcmF0aW9uJyldLFxuICBbUy5pc0V4cG9ydERlZmF1bHQsIF8ucHJvcCgnYm9keScpXSxcbiAgW18uVCwgICAgICAgICAgICAgICB0ZXJtID0+IHsgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RpbmcgYW4gRXhwb3J0IG9yIEV4cG9ydERlZmF1bHQgYnV0IGdvdCAke3Rlcm19YCk7IH1dXG5dKTtcblxuY29uc3QgRXhwU3BlYyA9IHggPT4gKHsgZXhwb3J0ZWROYW1lOiB4IH0pO1xuXG5jb25zdCBleHRyYWN0RGVjbGFyYXRpb25OYW1lcyA9IF8uY29uZChbXG4gIFtTLmlzVmFyaWFibGVEZWNsYXJhdG9yLCAgKHtiaW5kaW5nfSkgPT4gTGlzdC5vZihFeHBTcGVjKGJpbmRpbmcubmFtZSkpXSxcbiAgW1MuaXNWYXJpYWJsZURlY2xhcmF0aW9uLCAoe2RlY2xhcmF0b3JzfSkgPT4gZGVjbGFyYXRvcnMuZmxhdE1hcChleHRyYWN0RGVjbGFyYXRpb25OYW1lcyldLFxuICBbUy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24sICh7bmFtZX0pID0+IExpc3Qub2YoRXhwU3BlYyhuYW1lLm5hbWUpKV0sXG4gIFtTLmlzQ2xhc3NEZWNsYXJhdGlvbiwgICAgKHtuYW1lfSkgPT4gTGlzdC5vZihFeHBTcGVjKG5hbWUubmFtZSkpXVxuXSk7XG5cbnR5cGUgRXhwb3J0U3BlY2lmaWVyID0ge1xuICBuYW1lPzogU3ludGF4O1xuICBleHBvcnRlZE5hbWU6IFN5bnRheFxufVxuXG5mdW5jdGlvbiBleHRyYWN0TmFtZXModGVybTogVC5FeHBvcnREZWNsYXJhdGlvbik6IExpc3Q8RXhwb3J0U3BlY2lmaWVyPiB7XG4gIGlmIChTLmlzRXhwb3J0KHRlcm0pKSB7XG4gICAgcmV0dXJuIGV4dHJhY3REZWNsYXJhdGlvbk5hbWVzKHRlcm0uZGVjbGFyYXRpb24pO1xuICB9IGVsc2UgaWYgKFMuaXNFeHBvcnREZWZhdWx0KHRlcm0pKSB7XG4gICAgcmV0dXJuIExpc3QoKTsgXG4gIH0gZWxzZSBpZiAoUy5pc0V4cG9ydEZyb20odGVybSkpIHtcbiAgICByZXR1cm4gdGVybS5uYW1lZEV4cG9ydHM7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGV4cG9ydCB0eXBlYCk7XG59XG5cbmZ1bmN0aW9uIHdyYXBTdGF0ZW1lbnQoZGVjbGFyYXRpb246IFQuVGVybSkge1xuICBpZiAoUy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgcmV0dXJuIG5ldyBULlZhcmlhYmxlRGVjbGFyYXRpb25TdGF0ZW1lbnQoeyBkZWNsYXJhdGlvbiB9KTtcbiAgfVxuICByZXR1cm4gZGVjbGFyYXRpb247XG59XG5cbmNvbnN0IG1lbW9TeW0gPSBTeW1ib2woJ21lbW8nKTtcblxuZnVuY3Rpb24gbWFrZVZhckRlY2xTdG10KG5hbWU6IFQuQmluZGluZ0lkZW50aWZpZXIsICBleHByOiBULkV4cHJlc3Npb24pIHtcbiAgcmV0dXJuIG5ldyBULlZhcmlhYmxlRGVjbGFyYXRpb25TdGF0ZW1lbnQoe1xuICAgIGRlY2xhcmF0aW9uOiBuZXcgVC5WYXJpYWJsZURlY2xhcmF0aW9uKHtcbiAgICAgIGtpbmQ6ICd2YXInLFxuICAgICAgZGVjbGFyYXRvcnM6IExpc3Qub2YoXG4gICAgICAgIG5ldyBULlZhcmlhYmxlRGVjbGFyYXRvcih7XG4gICAgICAgICAgYmluZGluZzogbmFtZSxcbiAgICAgICAgICBpbml0OiBleHByXG4gICAgICAgIH0pXG4gICAgICApXG4gICAgfSlcbiAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN3ZWV0TW9kdWxlIHtcbiAgaXRlbXM6IExpc3Q8VC5UZXJtPjtcbiAgaW1wb3J0czogTGlzdDxULkltcG9ydERlY2xhcmF0aW9uPjtcbiAgZXhwb3J0czogTGlzdDxULkV4cG9ydERlY2xhcmF0aW9uPjtcbiAgZXhwb3J0ZWROYW1lczogTGlzdDxFeHBvcnRTcGVjaWZpZXI+O1xuXG4gIHJ1bnRpbWU6IExpc3Q8VC5UZXJtPjtcbiAgY29tcGlsZXRpbWU6IExpc3Q8VC5UZXJtPjtcblxuICBjb25zdHJ1Y3RvcihpdGVtczogTGlzdDxULlRlcm0+KSB7XG4gICAgbGV0IGJvZHkgPSBbXTtcbiAgICBsZXQgaW1wb3J0cyA9IFtdO1xuICAgIGxldCBleHBvcnRzID0gW107XG4gICAgdGhpcy5leHBvcnRlZE5hbWVzID0gTGlzdCgpO1xuICAgIGZvciAobGV0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgIGlmIChTLmlzSW1wb3J0RGVjbGFyYXRpb24oaXRlbSkpIHtcbiAgICAgICAgaW1wb3J0cy5wdXNoKGl0ZW0pO1xuICAgICAgfSBlbHNlIGlmIChTLmlzRXhwb3J0RGVjbGFyYXRpb24oaXRlbSkpIHtcbiAgICAgICAgZXhwb3J0cy5wdXNoKGl0ZW0pO1xuICAgICAgICB0aGlzLmV4cG9ydGVkTmFtZXMgPSB0aGlzLmV4cG9ydGVkTmFtZXMuY29uY2F0KGV4dHJhY3ROYW1lcyhpdGVtKSk7XG4gICAgICAgIGlmIChTLmlzRXhwb3J0KGl0ZW0pKSB7XG4gICAgICAgICAgYm9keS5wdXNoKHdyYXBTdGF0ZW1lbnQoZXh0cmFjdERlY2xhcmF0aW9uKGl0ZW0pKSk7IFxuICAgICAgICB9IGVsc2UgaWYgKFMuaXNFeHBvcnREZWZhdWx0KGl0ZW0pKSB7XG4gICAgICAgICAgbGV0IGRlY2wgPSBleHRyYWN0RGVjbGFyYXRpb24oaXRlbSk7XG4gICAgICAgICAgbGV0IGRlZlN0eCA9IFN5bnRheC5mcm9tSWRlbnRpZmllcignX2RlZmF1bHQnKTtcbiAgICAgICAgICBsZXQgZGVmID0gbmV3IFQuQmluZGluZ0lkZW50aWZpZXIoe1xuICAgICAgICAgICAgbmFtZTogZGVmU3R4XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5leHBvcnRlZE5hbWVzID0gdGhpcy5leHBvcnRlZE5hbWVzLnB1c2goRXhwU3BlYyhkZWZTdHgpKTtcbiAgICAgICAgICBpZiAoUy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oZGVjbCkgfHwgUy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICAgICAgICAgIGJvZHkucHVzaChkZWNsKTtcbiAgICAgICAgICAgIC8vIGV4dHJhY3QgbmFtZSBhbmQgYmluZCBpdCB0byBfZGVmYXVsdFxuICAgICAgICAgICAgYm9keS5wdXNoKG1ha2VWYXJEZWNsU3RtdChkZWYsIG5ldyBULklkZW50aWZpZXJFeHByZXNzaW9uKHsgbmFtZTogZGVjbC5uYW1lLm5hbWUgfSkpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZXhwcmVzc2lvbiBzbyBiaW5kIGl0IHRvIF9kZWZhdWx0XG4gICAgICAgICAgICBib2R5LnB1c2gobWFrZVZhckRlY2xTdG10KGRlZiwgZGVjbCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYm9keS5wdXNoKGl0ZW0pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLml0ZW1zID0gTGlzdChib2R5KTtcbiAgICB0aGlzLmltcG9ydHMgPSBMaXN0KGltcG9ydHMpO1xuICAgIHRoaXMuZXhwb3J0cyA9IExpc3QoZXhwb3J0cyk7XG4gIH1cblxuICAvLyAkRmxvd0ZpeE1lOiBmbG93IGRvZXNuJ3Qgc3VwcG9ydCBjb21wdXRlZCBwcm9wZXJ0eSBrZXlzIHlldFxuICBbbWVtb1N5bV0oKSB7XG4gICAgbGV0IHJ1bnRpbWUgPSBbXSwgY29tcGlsZXRpbWUgPSBbXTtcbiAgICBmb3IgKGxldCBpdGVtIG9mIHRoaXMuaXRlbXMpIHtcbiAgICAgIGlmIChTLmlzQ29tcGlsZXRpbWVTdGF0ZW1lbnQoaXRlbSkpIHtcbiAgICAgICAgY29tcGlsZXRpbWUucHVzaChpdGVtKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJ1bnRpbWUucHVzaChpdGVtKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5ydW50aW1lID0gTGlzdChydW50aW1lKTtcbiAgICB0aGlzLmNvbXBpbGV0aW1lID0gTGlzdChjb21waWxldGltZSk7XG4gIH1cblxuICBydW50aW1lSXRlbXMoKSB7XG4gICAgaWYgKHRoaXMucnVudGltZSA9PSBudWxsKSB7XG4gICAgICAvLyAkRmxvd0ZpeE1lOiBmbG93IGRvZXNuJ3Qgc3VwcG9ydCBjb21wdXRlZCBwcm9wZXJ0eSBrZXlzIHlldFxuICAgICAgdGhpc1ttZW1vU3ltXSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ydW50aW1lO1xuICB9XG5cbiAgY29tcGlsZXRpbWVJdGVtcygpIHtcbiAgICBpZiAodGhpcy5jb21waWxldGltZSA9PSBudWxsKSB7XG4gICAgICAvLyAkRmxvd0ZpeE1lOiBmbG93IGRvZXNuJ3Qgc3VwcG9ydCBjb21wdXRlZCBwcm9wZXJ0eSBrZXlzIHlldFxuICAgICAgdGhpc1ttZW1vU3ltXSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxldGltZTtcbiAgfVxuXG4gIHBhcnNlKCkge1xuICAgIHJldHVybiBuZXcgVC5Nb2R1bGUoe1xuICAgICAgaXRlbXM6IHRoaXMuaXRlbXMsXG4gICAgICBkaXJlY3RpdmVzOiBMaXN0KClcbiAgICB9KS5yZWR1Y2UobmV3IFN3ZWV0VG9TaGlmdFJlZHVjZXIoMCkpO1xuICB9XG5cbiAgY29kZWdlbigpIHtcbiAgICByZXR1cm4gY29kZWdlbih0aGlzLnBhcnNlKCkpLmNvZGU7XG4gIH1cbn1cbiJdfQ==