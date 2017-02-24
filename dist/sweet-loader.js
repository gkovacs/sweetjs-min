'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.phaseInModulePathRegexp = undefined;

var _tokenReader = require('./reader/token-reader');

var _tokenReader2 = _interopRequireDefault(_tokenReader);

var _scope = require('./scope');

var _env = require('./env');

var _env2 = _interopRequireDefault(_env);

var _immutable = require('immutable');

var _compiler = require('./compiler');

var _compiler2 = _interopRequireDefault(_compiler);

var _syntax = require('./syntax');

var _bindingMap = require('./binding-map.js');

var _bindingMap2 = _interopRequireDefault(_bindingMap);

var _sweetSpec = require('sweet-spec');

var _sweetSpec2 = _interopRequireDefault(_sweetSpec);

var _sweetModule = require('./sweet-module');

var _sweetModule2 = _interopRequireDefault(_sweetModule);

var _ramda = require('ramda');

var _ = _interopRequireWildcard(_ramda);

var _scopeReducer = require('./scope-reducer');

var _scopeReducer2 = _interopRequireDefault(_scopeReducer);

var _macroContext = require('./macro-context');

var _store = require('./store');

var _store2 = _interopRequireDefault(_store);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const phaseInModulePathRegexp = exports.phaseInModulePathRegexp = /(.*):(\d+)\s*$/;

class SweetLoader {

  constructor(baseDir, noBabel = false) {
    this.sourceCache = new Map();
    this.compiledCache = new Map();
    this.baseDir = baseDir;

    let bindings = new _bindingMap2.default();
    let templateMap = new Map();
    let tempIdent = 0;
    this.context = {
      phase: 0,
      bindings,
      templateMap,
      getTemplateIdentifier: () => ++tempIdent,
      loader: this,
      transform: c => {
        return {
          code: c
        };
      }
    };
  }

  normalize(name, refererName, refererAddress) {
    // takes `..path/to/source.js:<phase>`
    // gives `/abs/path/to/source.js:<phase>`
    // missing phases are turned into 0
    if (!phaseInModulePathRegexp.test(name)) {
      return `${ name }:0`;
    }
    return name;
  }

  locate({ name, metadata }) {
    // takes `/abs/path/to/source.js:<phase>`
    // gives { path: '/abs/path/to/source.js', phase: <phase> }
    let match = name.match(phaseInModulePathRegexp);
    if (match && match.length >= 3) {
      return {
        path: match[1],
        phase: parseInt(match[2], 10)
      };
    }
    throw new Error(`Module ${ name } is missing phase information`);
  }

  fetch({ name, address, metadata }) {
    throw new Error('No default fetch defined');
  }

  translate({ name, address, source, metadata }) {
    let src = this.compiledCache.get(address.path);
    if (src != null) {
      return src;
    }
    let compiledModule = this.compileSource(source);
    this.compiledCache.set(address.path, compiledModule);
    return compiledModule;
  }

  instantiate({ name, address, source, metadata }) {
    throw new Error('Not implemented yet');
  }

  eval(source) {
    return (0, eval)(source);
  }

  load(entryPath) {
    let metadata = {};
    let name = this.normalize(entryPath);
    let address = this.locate({ name, metadata });
    let source = this.fetch({ name, address, metadata });
    source = this.translate({ name, address, source, metadata });
    return this.instantiate({ name, address, source, metadata });
  }

  // skip instantiate
  compile(entryPath, refererName) {
    let metadata = {};
    let name = this.normalize(entryPath, refererName);
    let address = this.locate({ name, metadata });
    let source = this.fetch({ name, address, metadata });
    return this.translate({ name, address, source, metadata });
  }

  get(entryPath, entryPhase) {
    return this.compile(`${ entryPath }:${ entryPhase }`);
  }

  read(source) {
    return (0, _macroContext.wrapInTerms)((0, _tokenReader2.default)(source));
  }

  freshStore() {
    return new _store2.default({});
  }

  compileSource(source) {
    let stxl = this.read(source);
    let outScope = (0, _scope.freshScope)('outsideEdge');
    let inScope = (0, _scope.freshScope)('insideEdge0');
    // the compiler starts at phase 0, with an empty environment and store
    let compiler = new _compiler2.default(0, new _env2.default(), this.freshStore(), _.merge(this.context, {
      currentScope: [outScope, inScope]
    }));
    return new _sweetModule2.default(compiler.compile(stxl.map(s => s.reduce(new _scopeReducer2.default([{ scope: outScope, phase: _syntax.ALL_PHASES, flip: false }, { scope: inScope, phase: 0, flip: false }], this.context.bindings)))));
  }
}
exports.default = SweetLoader;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zd2VldC1sb2FkZXIuanMiXSwibmFtZXMiOlsiXyIsInBoYXNlSW5Nb2R1bGVQYXRoUmVnZXhwIiwiU3dlZXRMb2FkZXIiLCJjb25zdHJ1Y3RvciIsImJhc2VEaXIiLCJub0JhYmVsIiwic291cmNlQ2FjaGUiLCJNYXAiLCJjb21waWxlZENhY2hlIiwiYmluZGluZ3MiLCJ0ZW1wbGF0ZU1hcCIsInRlbXBJZGVudCIsImNvbnRleHQiLCJwaGFzZSIsImdldFRlbXBsYXRlSWRlbnRpZmllciIsImxvYWRlciIsInRyYW5zZm9ybSIsImMiLCJjb2RlIiwiYmFiZWxyYyIsIm5vcm1hbGl6ZSIsIm5hbWUiLCJyZWZlcmVyTmFtZSIsInJlZmVyZXJBZGRyZXNzIiwidGVzdCIsImxvY2F0ZSIsIm1ldGFkYXRhIiwibWF0Y2giLCJsZW5ndGgiLCJwYXRoIiwicGFyc2VJbnQiLCJFcnJvciIsImZldGNoIiwiYWRkcmVzcyIsInRyYW5zbGF0ZSIsInNvdXJjZSIsInNyYyIsImdldCIsImNvbXBpbGVkTW9kdWxlIiwiY29tcGlsZVNvdXJjZSIsInNldCIsImluc3RhbnRpYXRlIiwiZXZhbCIsImxvYWQiLCJlbnRyeVBhdGgiLCJjb21waWxlIiwiZW50cnlQaGFzZSIsInJlYWQiLCJmcmVzaFN0b3JlIiwic3R4bCIsIm91dFNjb3BlIiwiaW5TY29wZSIsImNvbXBpbGVyIiwibWVyZ2UiLCJjdXJyZW50U2NvcGUiLCJtYXAiLCJzIiwicmVkdWNlIiwic2NvcGUiLCJmbGlwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0lBQVlBLEM7O0FBQ1o7Ozs7QUFDQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7QUFFTyxNQUFNQyw0REFBMEIsZ0JBQWhDOztBQWFRLE1BQU1DLFdBQU4sQ0FBa0I7O0FBTS9CQyxjQUFZQyxPQUFaLEVBQTZCQyxVQUFtQixLQUFoRCxFQUF1RDtBQUNyRCxTQUFLQyxXQUFMLEdBQW1CLElBQUlDLEdBQUosRUFBbkI7QUFDQSxTQUFLQyxhQUFMLEdBQXFCLElBQUlELEdBQUosRUFBckI7QUFDQSxTQUFLSCxPQUFMLEdBQWVBLE9BQWY7O0FBRUEsUUFBSUssV0FBVywwQkFBZjtBQUNBLFFBQUlDLGNBQWMsSUFBSUgsR0FBSixFQUFsQjtBQUNBLFFBQUlJLFlBQVksQ0FBaEI7QUFDQSxTQUFLQyxPQUFMLEdBQWU7QUFDYkMsYUFBTyxDQURNO0FBRWJKLGNBRmE7QUFHYkMsaUJBSGE7QUFJYkksNkJBQXVCLE1BQU0sRUFBRUgsU0FKbEI7QUFLYkksY0FBUSxJQUxLO0FBTWJDLGlCQUFXQyxLQUFLO0FBQ2QsWUFBSVosT0FBSixFQUFhO0FBQ1gsaUJBQU87QUFDTGEsa0JBQU1EO0FBREQsV0FBUDtBQUdEO0FBQ0QsZUFBTywwQkFBTUEsQ0FBTixFQUFTO0FBQ2RFLG1CQUFTO0FBREssU0FBVCxDQUFQO0FBR0Q7QUFmWSxLQUFmO0FBaUJEOztBQUVEQyxZQUFVQyxJQUFWLEVBQXdCQyxXQUF4QixFQUE4Q0MsY0FBOUMsRUFBdUU7QUFDckU7QUFDQTtBQUNBO0FBQ0EsUUFBSSxDQUFDdEIsd0JBQXdCdUIsSUFBeEIsQ0FBNkJILElBQTdCLENBQUwsRUFBeUM7QUFDdkMsYUFBUSxJQUFFQSxJQUFLLEtBQWY7QUFDRDtBQUNELFdBQU9BLElBQVA7QUFDRDs7QUFFREksU0FBTyxFQUFDSixJQUFELEVBQU9LLFFBQVAsRUFBUCxFQUF1RDtBQUNyRDtBQUNBO0FBQ0EsUUFBSUMsUUFBUU4sS0FBS00sS0FBTCxDQUFXMUIsdUJBQVgsQ0FBWjtBQUNBLFFBQUkwQixTQUFTQSxNQUFNQyxNQUFOLElBQWdCLENBQTdCLEVBQWdDO0FBQzlCLGFBQU87QUFDTEMsY0FBTUYsTUFBTSxDQUFOLENBREQ7QUFFTGQsZUFBT2lCLFNBQVNILE1BQU0sQ0FBTixDQUFULEVBQW1CLEVBQW5CO0FBRkYsT0FBUDtBQUlEO0FBQ0QsVUFBTSxJQUFJSSxLQUFKLENBQVcsV0FBU1YsSUFBSyxnQ0FBekIsQ0FBTjtBQUNEOztBQUVEVyxRQUFNLEVBQUNYLElBQUQsRUFBT1ksT0FBUCxFQUFnQlAsUUFBaEIsRUFBTixFQUF1RztBQUNyRyxVQUFNLElBQUlLLEtBQUosQ0FBVSwwQkFBVixDQUFOO0FBQ0Q7O0FBRURHLFlBQVUsRUFBQ2IsSUFBRCxFQUFPWSxPQUFQLEVBQWdCRSxNQUFoQixFQUF3QlQsUUFBeEIsRUFBVixFQUFtSTtBQUNqSSxRQUFJVSxNQUFNLEtBQUs1QixhQUFMLENBQW1CNkIsR0FBbkIsQ0FBdUJKLFFBQVFKLElBQS9CLENBQVY7QUFDQSxRQUFJTyxPQUFPLElBQVgsRUFBaUI7QUFDZixhQUFPQSxHQUFQO0FBQ0Q7QUFDRCxRQUFJRSxpQkFBaUIsS0FBS0MsYUFBTCxDQUFtQkosTUFBbkIsQ0FBckI7QUFDQSxTQUFLM0IsYUFBTCxDQUFtQmdDLEdBQW5CLENBQXVCUCxRQUFRSixJQUEvQixFQUFxQ1MsY0FBckM7QUFDQSxXQUFPQSxjQUFQO0FBQ0Q7O0FBRURHLGNBQVksRUFBQ3BCLElBQUQsRUFBT1ksT0FBUCxFQUFnQkUsTUFBaEIsRUFBd0JULFFBQXhCLEVBQVosRUFBMEk7QUFDeEksVUFBTSxJQUFJSyxLQUFKLENBQVUscUJBQVYsQ0FBTjtBQUNEOztBQUVEVyxPQUFLUCxNQUFMLEVBQXFCO0FBQ25CLFdBQU8sQ0FBQyxHQUFHTyxJQUFKLEVBQVVQLE1BQVYsQ0FBUDtBQUNEOztBQUVEUSxPQUFLQyxTQUFMLEVBQXdCO0FBQ3RCLFFBQUlsQixXQUFXLEVBQWY7QUFDQSxRQUFJTCxPQUFPLEtBQUtELFNBQUwsQ0FBZXdCLFNBQWYsQ0FBWDtBQUNBLFFBQUlYLFVBQVUsS0FBS1IsTUFBTCxDQUFZLEVBQUVKLElBQUYsRUFBUUssUUFBUixFQUFaLENBQWQ7QUFDQSxRQUFJUyxTQUFTLEtBQUtILEtBQUwsQ0FBVyxFQUFFWCxJQUFGLEVBQVFZLE9BQVIsRUFBaUJQLFFBQWpCLEVBQVgsQ0FBYjtBQUNBUyxhQUFTLEtBQUtELFNBQUwsQ0FBZSxFQUFFYixJQUFGLEVBQVFZLE9BQVIsRUFBaUJFLE1BQWpCLEVBQXlCVCxRQUF6QixFQUFmLENBQVQ7QUFDQSxXQUFPLEtBQUtlLFdBQUwsQ0FBaUIsRUFBRXBCLElBQUYsRUFBUVksT0FBUixFQUFpQkUsTUFBakIsRUFBeUJULFFBQXpCLEVBQWpCLENBQVA7QUFDRDs7QUFFRDtBQUNBbUIsVUFBUUQsU0FBUixFQUEyQnRCLFdBQTNCLEVBQWlEO0FBQy9DLFFBQUlJLFdBQVcsRUFBZjtBQUNBLFFBQUlMLE9BQU8sS0FBS0QsU0FBTCxDQUFld0IsU0FBZixFQUEwQnRCLFdBQTFCLENBQVg7QUFDQSxRQUFJVyxVQUFVLEtBQUtSLE1BQUwsQ0FBWSxFQUFFSixJQUFGLEVBQVFLLFFBQVIsRUFBWixDQUFkO0FBQ0EsUUFBSVMsU0FBUyxLQUFLSCxLQUFMLENBQVcsRUFBRVgsSUFBRixFQUFRWSxPQUFSLEVBQWlCUCxRQUFqQixFQUFYLENBQWI7QUFDQSxXQUFPLEtBQUtRLFNBQUwsQ0FBZSxFQUFFYixJQUFGLEVBQVFZLE9BQVIsRUFBaUJFLE1BQWpCLEVBQXlCVCxRQUF6QixFQUFmLENBQVA7QUFDRDs7QUFFRFcsTUFBSU8sU0FBSixFQUF1QkUsVUFBdkIsRUFBMkM7QUFDekMsV0FBTyxLQUFLRCxPQUFMLENBQWMsSUFBRUQsU0FBVSxNQUFHRSxVQUFXLEdBQXhDLENBQVA7QUFDRDs7QUFFREMsT0FBS1osTUFBTCxFQUFpQztBQUMvQixXQUFPLCtCQUFZLDJCQUFLQSxNQUFMLENBQVosQ0FBUDtBQUNEOztBQUVEYSxlQUFhO0FBQ1gsV0FBTyxvQkFBVSxFQUFWLENBQVA7QUFDRDs7QUFFRFQsZ0JBQWNKLE1BQWQsRUFBOEI7QUFDNUIsUUFBSWMsT0FBTyxLQUFLRixJQUFMLENBQVVaLE1BQVYsQ0FBWDtBQUNBLFFBQUllLFdBQVcsdUJBQVcsYUFBWCxDQUFmO0FBQ0EsUUFBSUMsVUFBVSx1QkFBVyxhQUFYLENBQWQ7QUFDQTtBQUNBLFFBQUlDLFdBQVcsdUJBQWEsQ0FBYixFQUFnQixtQkFBaEIsRUFBMkIsS0FBS0osVUFBTCxFQUEzQixFQUErQ2hELEVBQUVxRCxLQUFGLENBQVEsS0FBS3pDLE9BQWIsRUFBc0I7QUFDbEYwQyxvQkFBYyxDQUFDSixRQUFELEVBQVdDLE9BQVg7QUFEb0UsS0FBdEIsQ0FBL0MsQ0FBZjtBQUdBLFdBQU8sMEJBQWdCQyxTQUFTUCxPQUFULENBQWlCSSxLQUFLTSxHQUFMLENBQVNDLEtBQUtBLEVBQUVDLE1BQUYsQ0FBUywyQkFBaUIsQ0FDOUUsRUFBRUMsT0FBT1IsUUFBVCxFQUFtQnJDLHlCQUFuQixFQUFzQzhDLE1BQU0sS0FBNUMsRUFEOEUsRUFFOUUsRUFBRUQsT0FBT1AsT0FBVCxFQUFrQnRDLE9BQU8sQ0FBekIsRUFBNEI4QyxNQUFNLEtBQWxDLEVBRjhFLENBQWpCLEVBRzdELEtBQUsvQyxPQUFMLENBQWFILFFBSGdELENBQVQsQ0FBZCxDQUFqQixDQUFoQixDQUFQO0FBS0Q7QUF6SDhCO2tCQUFaUCxXIiwiZmlsZSI6InN3ZWV0LWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEBmbG93XG5pbXBvcnQgcmVhZCBmcm9tICcuL3JlYWRlci90b2tlbi1yZWFkZXInO1xuaW1wb3J0IHsgZnJlc2hTY29wZSB9IGZyb20gJy4vc2NvcGUnO1xuaW1wb3J0IEVudiBmcm9tICcuL2Vudic7XG5pbXBvcnQgeyBMaXN0IH0gZnJvbSAnaW1tdXRhYmxlJztcbmltcG9ydCBDb21waWxlciBmcm9tICcuL2NvbXBpbGVyJztcbmltcG9ydCB7IEFMTF9QSEFTRVMgfSBmcm9tICcuL3N5bnRheCc7XG5pbXBvcnQgQmluZGluZ01hcCBmcm9tICcuL2JpbmRpbmctbWFwLmpzJztcbmltcG9ydCBUZXJtIGZyb20gJ3N3ZWV0LXNwZWMnO1xuaW1wb3J0IFN3ZWV0TW9kdWxlIGZyb20gJy4vc3dlZXQtbW9kdWxlJztcbmltcG9ydCAqIGFzIF8gZnJvbSAncmFtZGEnO1xuaW1wb3J0IFNjb3BlUmVkdWNlciBmcm9tICcuL3Njb3BlLXJlZHVjZXInO1xuaW1wb3J0IHsgd3JhcEluVGVybXMgfSBmcm9tICcuL21hY3JvLWNvbnRleHQnO1xuaW1wb3J0IHsgdHJhbnNmb3JtIGFzIGJhYmVsIH0gZnJvbSAnYmFiZWwtY29yZSc7XG5pbXBvcnQgU3RvcmUgZnJvbSAnLi9zdG9yZSc7XG5cbmV4cG9ydCBjb25zdCBwaGFzZUluTW9kdWxlUGF0aFJlZ2V4cCA9IC8oLiopOihcXGQrKVxccyokLztcblxuZXhwb3J0IHR5cGUgQ29udGV4dCA9IHtcbiAgYmluZGluZ3M6IGFueTtcbiAgdGVtcGxhdGVNYXA6IGFueTtcbiAgZ2V0VGVtcGxhdGVJZGVudGlmaWVyOiBhbnk7XG4gIGxvYWRlcjogYW55O1xuICB0cmFuc2Zvcm06IGFueTtcbiAgcGhhc2U6IG51bWJlcjtcbiAgc3RvcmU6IFN0b3JlO1xufVxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN3ZWV0TG9hZGVyIHtcbiAgc291cmNlQ2FjaGU6IE1hcDxzdHJpbmcsIHN0cmluZz47XG4gIGNvbXBpbGVkQ2FjaGU6IE1hcDxzdHJpbmcsIFN3ZWV0TW9kdWxlPjtcbiAgY29udGV4dDogYW55O1xuICBiYXNlRGlyOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoYmFzZURpcjogc3RyaW5nLCBub0JhYmVsOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICB0aGlzLnNvdXJjZUNhY2hlID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuY29tcGlsZWRDYWNoZSA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLmJhc2VEaXIgPSBiYXNlRGlyO1xuXG4gICAgbGV0IGJpbmRpbmdzID0gbmV3IEJpbmRpbmdNYXAoKTtcbiAgICBsZXQgdGVtcGxhdGVNYXAgPSBuZXcgTWFwKCk7XG4gICAgbGV0IHRlbXBJZGVudCA9IDA7XG4gICAgdGhpcy5jb250ZXh0ID0ge1xuICAgICAgcGhhc2U6IDAsXG4gICAgICBiaW5kaW5ncyxcbiAgICAgIHRlbXBsYXRlTWFwLFxuICAgICAgZ2V0VGVtcGxhdGVJZGVudGlmaWVyOiAoKSA9PiArK3RlbXBJZGVudCxcbiAgICAgIGxvYWRlcjogdGhpcyxcbiAgICAgIHRyYW5zZm9ybTogYyA9PiB7XG4gICAgICAgIGlmIChub0JhYmVsKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNvZGU6IGNcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBiYWJlbChjLCB7XG4gICAgICAgICAgYmFiZWxyYzogdHJ1ZVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgbm9ybWFsaXplKG5hbWU6IHN0cmluZywgcmVmZXJlck5hbWU/OiBzdHJpbmcsIHJlZmVyZXJBZGRyZXNzPzogc3RyaW5nKSB7XG4gICAgLy8gdGFrZXMgYC4ucGF0aC90by9zb3VyY2UuanM6PHBoYXNlPmBcbiAgICAvLyBnaXZlcyBgL2Ficy9wYXRoL3RvL3NvdXJjZS5qczo8cGhhc2U+YFxuICAgIC8vIG1pc3NpbmcgcGhhc2VzIGFyZSB0dXJuZWQgaW50byAwXG4gICAgaWYgKCFwaGFzZUluTW9kdWxlUGF0aFJlZ2V4cC50ZXN0KG5hbWUpKSB7XG4gICAgICByZXR1cm4gYCR7bmFtZX06MGA7XG4gICAgfVxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgbG9jYXRlKHtuYW1lLCBtZXRhZGF0YX06IHtuYW1lOiBzdHJpbmcsIG1ldGFkYXRhOiB7fX0pIHtcbiAgICAvLyB0YWtlcyBgL2Ficy9wYXRoL3RvL3NvdXJjZS5qczo8cGhhc2U+YFxuICAgIC8vIGdpdmVzIHsgcGF0aDogJy9hYnMvcGF0aC90by9zb3VyY2UuanMnLCBwaGFzZTogPHBoYXNlPiB9XG4gICAgbGV0IG1hdGNoID0gbmFtZS5tYXRjaChwaGFzZUluTW9kdWxlUGF0aFJlZ2V4cCk7XG4gICAgaWYgKG1hdGNoICYmIG1hdGNoLmxlbmd0aCA+PSAzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwYXRoOiBtYXRjaFsxXSxcbiAgICAgICAgcGhhc2U6IHBhcnNlSW50KG1hdGNoWzJdLCAxMClcbiAgICAgIH07XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgTW9kdWxlICR7bmFtZX0gaXMgbWlzc2luZyBwaGFzZSBpbmZvcm1hdGlvbmApO1xuICB9XG5cbiAgZmV0Y2goe25hbWUsIGFkZHJlc3MsIG1ldGFkYXRhfToge25hbWU6IHN0cmluZywgYWRkcmVzczoge3BhdGg6IHN0cmluZywgcGhhc2U6IG51bWJlcn0sIG1ldGFkYXRhOiB7fX0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGRlZmF1bHQgZmV0Y2ggZGVmaW5lZCcpO1xuICB9XG5cbiAgdHJhbnNsYXRlKHtuYW1lLCBhZGRyZXNzLCBzb3VyY2UsIG1ldGFkYXRhfToge25hbWU6IHN0cmluZywgYWRkcmVzczoge3BhdGg6IHN0cmluZywgcGhhc2U6IG51bWJlcn0sIHNvdXJjZTogc3RyaW5nLCBtZXRhZGF0YToge319KSB7XG4gICAgbGV0IHNyYyA9IHRoaXMuY29tcGlsZWRDYWNoZS5nZXQoYWRkcmVzcy5wYXRoKTtcbiAgICBpZiAoc3JjICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBzcmM7XG4gICAgfVxuICAgIGxldCBjb21waWxlZE1vZHVsZSA9IHRoaXMuY29tcGlsZVNvdXJjZShzb3VyY2UpO1xuICAgIHRoaXMuY29tcGlsZWRDYWNoZS5zZXQoYWRkcmVzcy5wYXRoLCBjb21waWxlZE1vZHVsZSk7XG4gICAgcmV0dXJuIGNvbXBpbGVkTW9kdWxlO1xuICB9XG5cbiAgaW5zdGFudGlhdGUoe25hbWUsIGFkZHJlc3MsIHNvdXJjZSwgbWV0YWRhdGF9OiB7bmFtZTogc3RyaW5nLCBhZGRyZXNzOiB7cGF0aDogc3RyaW5nLCBwaGFzZTogbnVtYmVyfSwgc291cmNlOiBTd2VldE1vZHVsZSwgbWV0YWRhdGE6IHt9fSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkIHlldCcpO1xuICB9XG5cbiAgZXZhbChzb3VyY2U6IHN0cmluZykge1xuICAgIHJldHVybiAoMCwgZXZhbCkoc291cmNlKTtcbiAgfVxuXG4gIGxvYWQoZW50cnlQYXRoOiBzdHJpbmcpIHtcbiAgICBsZXQgbWV0YWRhdGEgPSB7fTtcbiAgICBsZXQgbmFtZSA9IHRoaXMubm9ybWFsaXplKGVudHJ5UGF0aCk7XG4gICAgbGV0IGFkZHJlc3MgPSB0aGlzLmxvY2F0ZSh7IG5hbWUsIG1ldGFkYXRhIH0pO1xuICAgIGxldCBzb3VyY2UgPSB0aGlzLmZldGNoKHsgbmFtZSwgYWRkcmVzcywgbWV0YWRhdGEgfSk7XG4gICAgc291cmNlID0gdGhpcy50cmFuc2xhdGUoeyBuYW1lLCBhZGRyZXNzLCBzb3VyY2UsIG1ldGFkYXRhIH0pO1xuICAgIHJldHVybiB0aGlzLmluc3RhbnRpYXRlKHsgbmFtZSwgYWRkcmVzcywgc291cmNlLCBtZXRhZGF0YSB9KTtcbiAgfVxuXG4gIC8vIHNraXAgaW5zdGFudGlhdGVcbiAgY29tcGlsZShlbnRyeVBhdGg6IHN0cmluZywgcmVmZXJlck5hbWU/OiBzdHJpbmcpIHtcbiAgICBsZXQgbWV0YWRhdGEgPSB7fTtcbiAgICBsZXQgbmFtZSA9IHRoaXMubm9ybWFsaXplKGVudHJ5UGF0aCwgcmVmZXJlck5hbWUpO1xuICAgIGxldCBhZGRyZXNzID0gdGhpcy5sb2NhdGUoeyBuYW1lLCBtZXRhZGF0YSB9KTtcbiAgICBsZXQgc291cmNlID0gdGhpcy5mZXRjaCh7IG5hbWUsIGFkZHJlc3MsIG1ldGFkYXRhIH0pO1xuICAgIHJldHVybiB0aGlzLnRyYW5zbGF0ZSh7IG5hbWUsIGFkZHJlc3MsIHNvdXJjZSwgbWV0YWRhdGEgfSk7XG4gIH1cblxuICBnZXQoZW50cnlQYXRoOiBzdHJpbmcsIGVudHJ5UGhhc2U6IG51bWJlcikge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGUoYCR7ZW50cnlQYXRofToke2VudHJ5UGhhc2V9YCk7XG4gIH1cblxuICByZWFkKHNvdXJjZTogc3RyaW5nKTogTGlzdDxUZXJtPiB7XG4gICAgcmV0dXJuIHdyYXBJblRlcm1zKHJlYWQoc291cmNlKSk7XG4gIH1cblxuICBmcmVzaFN0b3JlKCkge1xuICAgIHJldHVybiBuZXcgU3RvcmUoe30pO1xuICB9XG5cbiAgY29tcGlsZVNvdXJjZShzb3VyY2U6IHN0cmluZykge1xuICAgIGxldCBzdHhsID0gdGhpcy5yZWFkKHNvdXJjZSk7XG4gICAgbGV0IG91dFNjb3BlID0gZnJlc2hTY29wZSgnb3V0c2lkZUVkZ2UnKTtcbiAgICBsZXQgaW5TY29wZSA9IGZyZXNoU2NvcGUoJ2luc2lkZUVkZ2UwJyk7XG4gICAgLy8gdGhlIGNvbXBpbGVyIHN0YXJ0cyBhdCBwaGFzZSAwLCB3aXRoIGFuIGVtcHR5IGVudmlyb25tZW50IGFuZCBzdG9yZVxuICAgIGxldCBjb21waWxlciA9IG5ldyBDb21waWxlcigwLCBuZXcgRW52KCksIHRoaXMuZnJlc2hTdG9yZSgpLCAgXy5tZXJnZSh0aGlzLmNvbnRleHQsIHtcbiAgICAgIGN1cnJlbnRTY29wZTogW291dFNjb3BlLCBpblNjb3BlXSxcbiAgICB9KSk7XG4gICAgcmV0dXJuIG5ldyBTd2VldE1vZHVsZShjb21waWxlci5jb21waWxlKHN0eGwubWFwKHMgPT4gcy5yZWR1Y2UobmV3IFNjb3BlUmVkdWNlcihbXG4gICAgICB7IHNjb3BlOiBvdXRTY29wZSwgcGhhc2U6IEFMTF9QSEFTRVMsIGZsaXA6IGZhbHNlIH0sXG4gICAgICB7IHNjb3BlOiBpblNjb3BlLCBwaGFzZTogMCwgZmxpcDogZmFsc2UgfV0sXG4gICAgICB0aGlzLmNvbnRleHQuYmluZGluZ3MpXG4gICAgKSkpKTtcbiAgfVxufVxuIl19