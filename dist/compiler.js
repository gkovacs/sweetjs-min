'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _termExpander = require('./term-expander.js');

var _termExpander2 = _interopRequireDefault(_termExpander);

var _tokenExpander = require('./token-expander');

var _tokenExpander2 = _interopRequireDefault(_tokenExpander);

var _ramda = require('ramda');

var _ = _interopRequireWildcard(_ramda);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Compiler {
  constructor(phase, env, store, context) {
    this.phase = phase;
    this.env = env;
    this.store = store;
    this.context = context;
  }

  compile(stxl) {
    let tokenExpander = new _tokenExpander2.default(_.merge(this.context, {
      phase: this.phase,
      env: this.env,
      store: this.store
    }));
    let termExpander = new _termExpander2.default(_.merge(this.context, {
      phase: this.phase,
      env: this.env,
      store: this.store
    }));

    return tokenExpander.expand(stxl).map(t => termExpander.expand(t));
  }
}
exports.default = Compiler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb21waWxlci5qcyJdLCJuYW1lcyI6WyJfIiwiQ29tcGlsZXIiLCJjb25zdHJ1Y3RvciIsInBoYXNlIiwiZW52Iiwic3RvcmUiLCJjb250ZXh0IiwiY29tcGlsZSIsInN0eGwiLCJ0b2tlbkV4cGFuZGVyIiwibWVyZ2UiLCJ0ZXJtRXhwYW5kZXIiLCJleHBhbmQiLCJtYXAiLCJ0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7O0lBQVlBLEM7Ozs7OztBQUdHLE1BQU1DLFFBQU4sQ0FBZTtBQUM1QkMsY0FBWUMsS0FBWixFQUFtQkMsR0FBbkIsRUFBd0JDLEtBQXhCLEVBQStCQyxPQUEvQixFQUF3QztBQUN0QyxTQUFLSCxLQUFMLEdBQWFBLEtBQWI7QUFDQSxTQUFLQyxHQUFMLEdBQVdBLEdBQVg7QUFDQSxTQUFLQyxLQUFMLEdBQWFBLEtBQWI7QUFDQSxTQUFLQyxPQUFMLEdBQWVBLE9BQWY7QUFDRDs7QUFFREMsVUFBUUMsSUFBUixFQUFjO0FBQ1osUUFBSUMsZ0JBQWdCLDRCQUFrQlQsRUFBRVUsS0FBRixDQUFRLEtBQUtKLE9BQWIsRUFBc0I7QUFDMURILGFBQU8sS0FBS0EsS0FEOEM7QUFFMURDLFdBQUssS0FBS0EsR0FGZ0Q7QUFHMURDLGFBQU8sS0FBS0E7QUFIOEMsS0FBdEIsQ0FBbEIsQ0FBcEI7QUFLQSxRQUFJTSxlQUFlLDJCQUFpQlgsRUFBRVUsS0FBRixDQUFRLEtBQUtKLE9BQWIsRUFBc0I7QUFDeERILGFBQU8sS0FBS0EsS0FENEM7QUFFeERDLFdBQUssS0FBS0EsR0FGOEM7QUFHeERDLGFBQU8sS0FBS0E7QUFINEMsS0FBdEIsQ0FBakIsQ0FBbkI7O0FBTUEsV0FBT0ksY0FBY0csTUFBZCxDQUFxQkosSUFBckIsRUFBMkJLLEdBQTNCLENBQStCQyxLQUFLSCxhQUFhQyxNQUFiLENBQW9CRSxDQUFwQixDQUFwQyxDQUFQO0FBQ0Q7QUFyQjJCO2tCQUFUYixRIiwiZmlsZSI6ImNvbXBpbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFRlcm1FeHBhbmRlciBmcm9tICcuL3Rlcm0tZXhwYW5kZXIuanMnO1xuaW1wb3J0IFRva2VuRXhwYW5kZXIgZnJvbSAnLi90b2tlbi1leHBhbmRlcic7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ3JhbWRhJztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb21waWxlciB7XG4gIGNvbnN0cnVjdG9yKHBoYXNlLCBlbnYsIHN0b3JlLCBjb250ZXh0KSB7XG4gICAgdGhpcy5waGFzZSA9IHBoYXNlO1xuICAgIHRoaXMuZW52ID0gZW52O1xuICAgIHRoaXMuc3RvcmUgPSBzdG9yZTtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB9XG5cbiAgY29tcGlsZShzdHhsKSB7XG4gICAgbGV0IHRva2VuRXhwYW5kZXIgPSBuZXcgVG9rZW5FeHBhbmRlcihfLm1lcmdlKHRoaXMuY29udGV4dCwge1xuICAgICAgcGhhc2U6IHRoaXMucGhhc2UsXG4gICAgICBlbnY6IHRoaXMuZW52LFxuICAgICAgc3RvcmU6IHRoaXMuc3RvcmVcbiAgICB9KSk7XG4gICAgbGV0IHRlcm1FeHBhbmRlciA9IG5ldyBUZXJtRXhwYW5kZXIoXy5tZXJnZSh0aGlzLmNvbnRleHQsIHtcbiAgICAgIHBoYXNlOiB0aGlzLnBoYXNlLFxuICAgICAgZW52OiB0aGlzLmVudixcbiAgICAgIHN0b3JlOiB0aGlzLnN0b3JlXG4gICAgfSkpO1xuXG4gICAgcmV0dXJuIHRva2VuRXhwYW5kZXIuZXhwYW5kKHN0eGwpLm1hcCh0ID0+IHRlcm1FeHBhbmRlci5leHBhbmQodCkpO1xuICB9XG59XG4iXX0=