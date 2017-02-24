'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.expandCompiletime = expandCompiletime;
exports.sanitizeReplacementValues = sanitizeReplacementValues;
exports.evalCompiletimeValue = evalCompiletimeValue;

var _sweetSpec = require('sweet-spec');

var S = _interopRequireWildcard(_sweetSpec);

var _ramda = require('ramda');

var _ = _interopRequireWildcard(_ramda);

var _immutable = require('immutable');

var _syntax = require('./syntax');

var _syntax2 = _interopRequireDefault(_syntax);

var _shiftCodegen = require('shift-codegen');

var _shiftCodegen2 = _interopRequireDefault(_shiftCodegen);

var _sweetToShiftReducer = require('./sweet-to-shift-reducer');

var _sweetToShiftReducer2 = _interopRequireDefault(_sweetToShiftReducer);

var _termExpander = require('./term-expander');

var _termExpander2 = _interopRequireDefault(_termExpander);

var _env = require('./env');

var _env2 = _interopRequireDefault(_env);

var _templateProcessor = require('./template-processor');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function expandCompiletime(term, context) {
  // each compiletime value needs to be expanded with a fresh
  // environment and in the next higher phase
  let syntaxExpander = new _termExpander2.default(_.merge(context, {
    phase: context.phase + 1,
    env: new _env2.default(),
    store: context.store
  }));

  return syntaxExpander.expand(term);
}

function sanitizeReplacementValues(values) {
  if (Array.isArray(values)) {
    return sanitizeReplacementValues((0, _immutable.List)(values));
  } else if (_immutable.List.isList(values)) {
    return values.map(sanitizeReplacementValues);
  } else if (values == null) {
    throw new Error('replacement values for syntax template must not be null or undefined');
  } else if (typeof values.next === 'function') {
    return sanitizeReplacementValues((0, _immutable.List)(values));
  }
  return values;
}

// (Expression, Context) -> [function]
function evalCompiletimeValue(expr, context) {
  let sandbox = {
    syntaxTemplate: function (ident, ...values) {
      return (0, _templateProcessor.replaceTemplate)(context.templateMap.get(ident), sanitizeReplacementValues(values));
    }
  };

  let sandboxKeys = (0, _immutable.List)(Object.keys(sandbox));
  let sandboxVals = sandboxKeys.map(k => sandbox[k]).toArray();

  let parsed = new S.Module({
    directives: (0, _immutable.List)(),
    items: _immutable.List.of(new S.ExpressionStatement({
      expression: new S.FunctionExpression({
        isGenerator: false,
        name: null,
        params: new S.FormalParameters({
          items: sandboxKeys.map(param => {
            return new S.BindingIdentifier({
              name: _syntax2.default.from('identifier', param)
            });
          }),
          rest: null
        }),
        body: new S.FunctionBody({
          directives: _immutable.List.of(new S.Directive({
            rawValue: 'use strict'
          })),
          statements: _immutable.List.of(new S.ReturnStatement({
            expression: expr
          }))
        })
      })
    }))
  }).reduce(new _sweetToShiftReducer2.default(context.phase));

  let gen = (0, _shiftCodegen2.default)(parsed, new _shiftCodegen.FormattedCodeGen());
  let result = context.transform(gen);

  let val = context.loader.eval(result.code, context.store);
  return val.apply(undefined, sandboxVals);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9sb2FkLXN5bnRheC5qcyJdLCJuYW1lcyI6WyJleHBhbmRDb21waWxldGltZSIsInNhbml0aXplUmVwbGFjZW1lbnRWYWx1ZXMiLCJldmFsQ29tcGlsZXRpbWVWYWx1ZSIsIlMiLCJfIiwidGVybSIsImNvbnRleHQiLCJzeW50YXhFeHBhbmRlciIsIm1lcmdlIiwicGhhc2UiLCJlbnYiLCJzdG9yZSIsImV4cGFuZCIsInZhbHVlcyIsIkFycmF5IiwiaXNBcnJheSIsImlzTGlzdCIsIm1hcCIsIkVycm9yIiwibmV4dCIsImV4cHIiLCJzYW5kYm94Iiwic3ludGF4VGVtcGxhdGUiLCJpZGVudCIsInRlbXBsYXRlTWFwIiwiZ2V0Iiwic2FuZGJveEtleXMiLCJPYmplY3QiLCJrZXlzIiwic2FuZGJveFZhbHMiLCJrIiwidG9BcnJheSIsInBhcnNlZCIsIk1vZHVsZSIsImRpcmVjdGl2ZXMiLCJpdGVtcyIsIm9mIiwiRXhwcmVzc2lvblN0YXRlbWVudCIsImV4cHJlc3Npb24iLCJGdW5jdGlvbkV4cHJlc3Npb24iLCJpc0dlbmVyYXRvciIsIm5hbWUiLCJwYXJhbXMiLCJGb3JtYWxQYXJhbWV0ZXJzIiwicGFyYW0iLCJCaW5kaW5nSWRlbnRpZmllciIsImZyb20iLCJyZXN0IiwiYm9keSIsIkZ1bmN0aW9uQm9keSIsIkRpcmVjdGl2ZSIsInJhd1ZhbHVlIiwic3RhdGVtZW50cyIsIlJldHVyblN0YXRlbWVudCIsInJlZHVjZSIsImdlbiIsInJlc3VsdCIsInRyYW5zZm9ybSIsInZhbCIsImxvYWRlciIsImV2YWwiLCJjb2RlIiwiYXBwbHkiLCJ1bmRlZmluZWQiXSwibWFwcGluZ3MiOiI7Ozs7O1FBV2dCQSxpQixHQUFBQSxpQjtRQVlBQyx5QixHQUFBQSx5QjtRQWNBQyxvQixHQUFBQSxvQjs7QUFyQ2hCOztJQUFZQyxDOztBQUNaOztJQUFZQyxDOztBQUNaOztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFFQTs7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LDRCQUFRdkIsTUFBUixFQUFnQixvQ0FBaEIsQ0FBVjtBQUNBLE1BQUl3QixTQUFTbEQsUUFBUW1ELFNBQVIsQ0FBa0JGLEdBQWxCLENBQWI7O0FBRUEsTUFBSUcsTUFBTXBELFFBQVFxRCxNQUFSLENBQWVDLElBQWYsQ0FBb0JKLE9BQU9LLElBQTNCLEVBQWlDdkQsUUFBUUssS0FBekMsQ0FBVjtBQUNBLFNBQU8rQyxJQUFJSSxLQUFKLENBQVVDLFNBQVYsRUFBcUJsQyxXQUFyQixDQUFQO0FBQ0QiLCJmaWxlIjoibG9hZC1zeW50YXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBTIGZyb20gJ3N3ZWV0LXNwZWMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdyYW1kYSc7XG5pbXBvcnQgeyBMaXN0IH0gZnJvbSAnaW1tdXRhYmxlJztcbmltcG9ydCBTeW50YXggZnJvbSAnLi9zeW50YXgnO1xuaW1wb3J0IGNvZGVnZW4sIHsgRm9ybWF0dGVkQ29kZUdlbiB9IGZyb20gJ3NoaWZ0LWNvZGVnZW4nO1xuaW1wb3J0IFN3ZWV0VG9TaGlmdFJlZHVjZXIgZnJvbSAnLi9zd2VldC10by1zaGlmdC1yZWR1Y2VyJztcbmltcG9ydCBUZXJtRXhwYW5kZXIgZnJvbSAnLi90ZXJtLWV4cGFuZGVyJztcbmltcG9ydCBFbnYgZnJvbSAnLi9lbnYnO1xuXG5pbXBvcnQgeyByZXBsYWNlVGVtcGxhdGUgfSBmcm9tICcuL3RlbXBsYXRlLXByb2Nlc3Nvcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBleHBhbmRDb21waWxldGltZSh0ZXJtLCBjb250ZXh0KSB7XG4gIC8vIGVhY2ggY29tcGlsZXRpbWUgdmFsdWUgbmVlZHMgdG8gYmUgZXhwYW5kZWQgd2l0aCBhIGZyZXNoXG4gIC8vIGVudmlyb25tZW50IGFuZCBpbiB0aGUgbmV4dCBoaWdoZXIgcGhhc2VcbiAgbGV0IHN5bnRheEV4cGFuZGVyID0gbmV3IFRlcm1FeHBhbmRlcihfLm1lcmdlKGNvbnRleHQsIHtcbiAgICBwaGFzZTogY29udGV4dC5waGFzZSArIDEsXG4gICAgZW52OiBuZXcgRW52KCksXG4gICAgc3RvcmU6IGNvbnRleHQuc3RvcmVcbiAgfSkpO1xuXG4gIHJldHVybiBzeW50YXhFeHBhbmRlci5leHBhbmQodGVybSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYW5pdGl6ZVJlcGxhY2VtZW50VmFsdWVzKHZhbHVlcykge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZXMpKSB7XG4gICAgcmV0dXJuIHNhbml0aXplUmVwbGFjZW1lbnRWYWx1ZXMoTGlzdCh2YWx1ZXMpKTtcbiAgfSBlbHNlIGlmIChMaXN0LmlzTGlzdCh2YWx1ZXMpKSB7XG4gICAgcmV0dXJuIHZhbHVlcy5tYXAoc2FuaXRpemVSZXBsYWNlbWVudFZhbHVlcyk7XG4gIH0gZWxzZSBpZiAodmFsdWVzID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlcGxhY2VtZW50IHZhbHVlcyBmb3Igc3ludGF4IHRlbXBsYXRlIG11c3Qgbm90IGJlIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlcy5uZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHNhbml0aXplUmVwbGFjZW1lbnRWYWx1ZXMoTGlzdCh2YWx1ZXMpKTtcbiAgfVxuICByZXR1cm4gdmFsdWVzO1xufVxuXG4vLyAoRXhwcmVzc2lvbiwgQ29udGV4dCkgLT4gW2Z1bmN0aW9uXVxuZXhwb3J0IGZ1bmN0aW9uIGV2YWxDb21waWxldGltZVZhbHVlKGV4cHI6IFMuRXhwcmVzc2lvbiwgY29udGV4dDogYW55KSB7XG4gIGxldCBzYW5kYm94ID0ge1xuICAgIHN5bnRheFRlbXBsYXRlOiBmdW5jdGlvbihpZGVudCwgLi4udmFsdWVzKSB7XG4gICAgICByZXR1cm4gcmVwbGFjZVRlbXBsYXRlKGNvbnRleHQudGVtcGxhdGVNYXAuZ2V0KGlkZW50KSwgc2FuaXRpemVSZXBsYWNlbWVudFZhbHVlcyh2YWx1ZXMpKTtcbiAgICB9XG4gIH07XG5cbiAgbGV0IHNhbmRib3hLZXlzID0gTGlzdChPYmplY3Qua2V5cyhzYW5kYm94KSk7XG4gIGxldCBzYW5kYm94VmFscyA9IHNhbmRib3hLZXlzLm1hcChrID0+IHNhbmRib3hba10pLnRvQXJyYXkoKTtcblxuICBsZXQgcGFyc2VkID0gbmV3IFMuTW9kdWxlKHtcbiAgICBkaXJlY3RpdmVzOiBMaXN0KCksXG4gICAgaXRlbXM6IExpc3Qub2YobmV3IFMuRXhwcmVzc2lvblN0YXRlbWVudCh7XG4gICAgICBleHByZXNzaW9uOiBuZXcgUy5GdW5jdGlvbkV4cHJlc3Npb24oe1xuICAgICAgICBpc0dlbmVyYXRvcjogZmFsc2UsXG4gICAgICAgIG5hbWU6IG51bGwsXG4gICAgICAgIHBhcmFtczogbmV3IFMuRm9ybWFsUGFyYW1ldGVycyh7XG4gICAgICAgICAgaXRlbXM6IHNhbmRib3hLZXlzLm1hcChwYXJhbSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFMuQmluZGluZ0lkZW50aWZpZXIoe1xuICAgICAgICAgICAgICBuYW1lOiBTeW50YXguZnJvbSgnaWRlbnRpZmllcicsIHBhcmFtKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgcmVzdDogbnVsbFxuICAgICAgICB9KSxcbiAgICAgICAgYm9keTogbmV3IFMuRnVuY3Rpb25Cb2R5KHtcbiAgICAgICAgICBkaXJlY3RpdmVzOiBMaXN0Lm9mKG5ldyBTLkRpcmVjdGl2ZSh7XG4gICAgICAgICAgICByYXdWYWx1ZTogJ3VzZSBzdHJpY3QnXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIHN0YXRlbWVudHM6IExpc3Qub2YobmV3IFMuUmV0dXJuU3RhdGVtZW50KHtcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGV4cHJcbiAgICAgICAgICB9KSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfSkpXG4gIH0pLnJlZHVjZShuZXcgU3dlZXRUb1NoaWZ0UmVkdWNlcihjb250ZXh0LnBoYXNlKSk7XG5cbiAgbGV0IGdlbiA9IGNvZGVnZW4ocGFyc2VkLCBuZXcgRm9ybWF0dGVkQ29kZUdlbik7XG4gIGxldCByZXN1bHQgPSBjb250ZXh0LnRyYW5zZm9ybShnZW4pO1xuXG4gIGxldCB2YWwgPSBjb250ZXh0LmxvYWRlci5ldmFsKHJlc3VsdC5jb2RlLCBjb250ZXh0LnN0b3JlKTtcbiAgcmV0dXJuIHZhbC5hcHBseSh1bmRlZmluZWQsIHNhbmRib3hWYWxzKTtcbn1cbiJdfQ==