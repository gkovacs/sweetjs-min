'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sweetSpec = require('sweet-spec');

var S = _interopRequireWildcard(_sweetSpec);

var _immutable = require('immutable');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

exports.default = class extends S.default.CloneReducer {

  constructor(phase) {
    super();
    this.phase = phase;
  }

  reduceModule(t, s) {
    return new S.Module({
      directives: s.directives.toArray(),
      items: s.items.toArray()
    });
  }

  reduceIdentifierExpression(t, s) {
    return new S.IdentifierExpression({
      name: s.name.resolve(this.phase)
    });
  }

  reduceStaticPropertyName(t, s) {
    return new S.StaticPropertyName({
      value: s.value.val().toString()
    });
  }

  reduceBindingIdentifier(t, s) {
    return new S.BindingIdentifier({
      name: s.name.resolve(this.phase)
    });
  }

  reduceStaticMemberExpression(t, s) {
    return new S.StaticMemberExpression({
      object: s.object,
      property: s.property.val()
    });
  }

  reduceFunctionBody(t, s) {
    return new S.FunctionBody({
      directives: s.directives.toArray(),
      statements: s.statements.toArray()
    });
  }

  reduceVariableDeclarationStatement(t, s) {
    if (t.declaration.kind === 'syntax' || t.declaration.kind === 'syntaxrec') {
      return new S.EmptyStatement();
    }
    return new S.VariableDeclarationStatement({
      declaration: s.declaration
    });
  }

  reduceVariableDeclaration(t, s) {
    return new S.VariableDeclaration({
      kind: s.kind,
      declarators: s.declarators.toArray()
    });
  }

  reduceCallExpression(t, s) {
    return new S.CallExpression({
      callee: s.callee,
      arguments: s.arguments.toArray()
    });
  }

  reduceArrayExpression(t, s) {
    return new S.ArrayExpression({
      elements: s.elements.toArray()
    });
  }

  reduceImport() {
    return new S.EmptyStatement({});
  }

  reduceBlock(t, s) {
    return new S.Block({
      statements: s.statements.toArray()
    });
  }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zd2VldC10by1zaGlmdC1yZWR1Y2VyLmpzIl0sIm5hbWVzIjpbIlMiLCJDbG9uZVJlZHVjZXIiLCJjb25zdHJ1Y3RvciIsInBoYXNlIiwicmVkdWNlTW9kdWxlIiwidCIsInMiLCJNb2R1bGUiLCJkaXJlY3RpdmVzIiwidG9BcnJheSIsIml0ZW1zIiwicmVkdWNlSWRlbnRpZmllckV4cHJlc3Npb24iLCJJZGVudGlmaWVyRXhwcmVzc2lvbiIsIm5hbWUiLCJyZXNvbHZlIiwicmVkdWNlU3RhdGljUHJvcGVydHlOYW1lIiwiU3RhdGljUHJvcGVydHlOYW1lIiwidmFsdWUiLCJ2YWwiLCJ0b1N0cmluZyIsInJlZHVjZUJpbmRpbmdJZGVudGlmaWVyIiwiQmluZGluZ0lkZW50aWZpZXIiLCJyZWR1Y2VTdGF0aWNNZW1iZXJFeHByZXNzaW9uIiwiU3RhdGljTWVtYmVyRXhwcmVzc2lvbiIsIm9iamVjdCIsInByb3BlcnR5IiwicmVkdWNlRnVuY3Rpb25Cb2R5IiwiRnVuY3Rpb25Cb2R5Iiwic3RhdGVtZW50cyIsInJlZHVjZVZhcmlhYmxlRGVjbGFyYXRpb25TdGF0ZW1lbnQiLCJkZWNsYXJhdGlvbiIsImtpbmQiLCJFbXB0eVN0YXRlbWVudCIsIlZhcmlhYmxlRGVjbGFyYXRpb25TdGF0ZW1lbnQiLCJyZWR1Y2VWYXJpYWJsZURlY2xhcmF0aW9uIiwiVmFyaWFibGVEZWNsYXJhdGlvbiIsImRlY2xhcmF0b3JzIiwicmVkdWNlQ2FsbEV4cHJlc3Npb24iLCJDYWxsRXhwcmVzc2lvbiIsImNhbGxlZSIsImFyZ3VtZW50cyIsInJlZHVjZUFycmF5RXhwcmVzc2lvbiIsIkFycmF5RXhwcmVzc2lvbiIsImVsZW1lbnRzIiwicmVkdWNlSW1wb3J0IiwicmVkdWNlQmxvY2siLCJCbG9jayJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0E7O0lBQWtCQSxDOztBQUNsQjs7OztrQkFHZSxjQUpHQSxDQUlXLFNBQUtDLFlBQW5CLENBQWdDOztBQUc3Q0MsY0FBWUMsS0FBWixFQUEyQjtBQUN6QjtBQUNBLFNBQUtBLEtBQUwsR0FBYUEsS0FBYjtBQUNEOztBQUVEQyxlQUFhQyxDQUFiLEVBQXNCQyxDQUF0QixFQUFzRTtBQUNwRSxXQUFPLElBQUlOLEVBQUVPLE1BQU4sQ0FBYTtBQUNsQkMsa0JBQVlGLEVBQUVFLFVBQUYsQ0FBYUMsT0FBYixFQURNO0FBRWxCQyxhQUFPSixFQUFFSSxLQUFGLENBQVFELE9BQVI7QUFGVyxLQUFiLENBQVA7QUFJRDs7QUFFREUsNkJBQTJCTixDQUEzQixFQUFvQ0MsQ0FBcEMsRUFBeUQ7QUFDdkQsV0FBTyxJQUFJTixFQUFFWSxvQkFBTixDQUEyQjtBQUNoQ0MsWUFBTVAsRUFBRU8sSUFBRixDQUFPQyxPQUFQLENBQWUsS0FBS1gsS0FBcEI7QUFEMEIsS0FBM0IsQ0FBUDtBQUdEOztBQUVEWSwyQkFBeUJWLENBQXpCLEVBQWtDQyxDQUFsQyxFQUF3RDtBQUN0RCxXQUFPLElBQUlOLEVBQUVnQixrQkFBTixDQUF5QjtBQUM5QkMsYUFBT1gsRUFBRVcsS0FBRixDQUFRQyxHQUFSLEdBQWNDLFFBQWQ7QUFEdUIsS0FBekIsQ0FBUDtBQUdEOztBQUVEQywwQkFBd0JmLENBQXhCLEVBQWlDQyxDQUFqQyxFQUFzRDtBQUNwRCxXQUFPLElBQUlOLEVBQUVxQixpQkFBTixDQUF3QjtBQUM3QlIsWUFBTVAsRUFBRU8sSUFBRixDQUFPQyxPQUFQLENBQWUsS0FBS1gsS0FBcEI7QUFEdUIsS0FBeEIsQ0FBUDtBQUdEOztBQUVEbUIsK0JBQTZCakIsQ0FBN0IsRUFBc0NDLENBQXRDLEVBQTRFO0FBQzFFLFdBQU8sSUFBSU4sRUFBRXVCLHNCQUFOLENBQTZCO0FBQ2xDQyxjQUFRbEIsRUFBRWtCLE1BRHdCO0FBRWxDQyxnQkFBVW5CLEVBQUVtQixRQUFGLENBQVdQLEdBQVg7QUFGd0IsS0FBN0IsQ0FBUDtBQUlEOztBQUVEUSxxQkFBbUJyQixDQUFuQixFQUE0QkMsQ0FBNUIsRUFBaUY7QUFDL0UsV0FBTyxJQUFJTixFQUFFMkIsWUFBTixDQUFtQjtBQUN4Qm5CLGtCQUFZRixFQUFFRSxVQUFGLENBQWFDLE9BQWIsRUFEWTtBQUV4Qm1CLGtCQUFZdEIsRUFBRXNCLFVBQUYsQ0FBYW5CLE9BQWI7QUFGWSxLQUFuQixDQUFQO0FBSUQ7O0FBRURvQixxQ0FBbUN4QixDQUFuQyxFQUE0Q0MsQ0FBNUMsRUFBcUU7QUFDbkUsUUFBSUQsRUFBRXlCLFdBQUYsQ0FBY0MsSUFBZCxLQUF1QixRQUF2QixJQUFtQzFCLEVBQUV5QixXQUFGLENBQWNDLElBQWQsS0FBdUIsV0FBOUQsRUFBMkU7QUFDekUsYUFBTyxJQUFJL0IsRUFBRWdDLGNBQU4sRUFBUDtBQUNEO0FBQ0QsV0FBTyxJQUFJaEMsRUFBRWlDLDRCQUFOLENBQW1DO0FBQ3hDSCxtQkFBYXhCLEVBQUV3QjtBQUR5QixLQUFuQyxDQUFQO0FBR0Q7O0FBRURJLDRCQUEwQjdCLENBQTFCLEVBQW1DQyxDQUFuQyxFQUE2RTtBQUMzRSxXQUFPLElBQUlOLEVBQUVtQyxtQkFBTixDQUEwQjtBQUMvQkosWUFBTXpCLEVBQUV5QixJQUR1QjtBQUUvQkssbUJBQWE5QixFQUFFOEIsV0FBRixDQUFjM0IsT0FBZDtBQUZrQixLQUExQixDQUFQO0FBSUQ7O0FBRUQ0Qix1QkFBcUJoQyxDQUFyQixFQUE4QkMsQ0FBOUIsRUFBd0U7QUFDdEUsV0FBTyxJQUFJTixFQUFFc0MsY0FBTixDQUFxQjtBQUMxQkMsY0FBUWpDLEVBQUVpQyxNQURnQjtBQUUxQkMsaUJBQVdsQyxFQUFFa0MsU0FBRixDQUFZL0IsT0FBWjtBQUZlLEtBQXJCLENBQVA7QUFJRDs7QUFFRGdDLHdCQUFzQnBDLENBQXRCLEVBQStCQyxDQUEvQixFQUEyRDtBQUN6RCxXQUFPLElBQUlOLEVBQUUwQyxlQUFOLENBQXNCO0FBQzNCQyxnQkFBVXJDLEVBQUVxQyxRQUFGLENBQVdsQyxPQUFYO0FBRGlCLEtBQXRCLENBQVA7QUFHRDs7QUFFRG1DLGlCQUFlO0FBQ2IsV0FBTyxJQUFJNUMsRUFBRWdDLGNBQU4sQ0FBcUIsRUFBckIsQ0FBUDtBQUNEOztBQUVEYSxjQUFZeEMsQ0FBWixFQUFxQkMsQ0FBckIsRUFBbUQ7QUFDakQsV0FBTyxJQUFJTixFQUFFOEMsS0FBTixDQUFZO0FBQ2pCbEIsa0JBQVl0QixFQUFFc0IsVUFBRixDQUFhbkIsT0FBYjtBQURLLEtBQVosQ0FBUDtBQUdEO0FBcEY0QyxDIiwiZmlsZSI6InN3ZWV0LXRvLXNoaWZ0LXJlZHVjZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAZmxvd1xuaW1wb3J0IFRlcm0sICogYXMgUyBmcm9tICdzd2VldC1zcGVjJztcbmltcG9ydCB7IExpc3QgfSBmcm9tICdpbW11dGFibGUnO1xuaW1wb3J0IHR5cGUgU3ludGF4IGZyb20gJy4vc3ludGF4LmpzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgZXh0ZW5kcyBUZXJtLkNsb25lUmVkdWNlciB7XG4gIHBoYXNlOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IocGhhc2U6IG51bWJlcikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5waGFzZSA9IHBoYXNlO1xuICB9XG5cbiAgcmVkdWNlTW9kdWxlKHQ6IFRlcm0sIHM6IHsgZGlyZWN0aXZlczogTGlzdDxhbnk+LCBpdGVtczogTGlzdDxhbnk+IH0pIHtcbiAgICByZXR1cm4gbmV3IFMuTW9kdWxlKHtcbiAgICAgIGRpcmVjdGl2ZXM6IHMuZGlyZWN0aXZlcy50b0FycmF5KCksXG4gICAgICBpdGVtczogcy5pdGVtcy50b0FycmF5KClcbiAgICB9KTtcbiAgfVxuXG4gIHJlZHVjZUlkZW50aWZpZXJFeHByZXNzaW9uKHQ6IFRlcm0sIHM6IHsgbmFtZTogU3ludGF4IH0pIHtcbiAgICByZXR1cm4gbmV3IFMuSWRlbnRpZmllckV4cHJlc3Npb24oe1xuICAgICAgbmFtZTogcy5uYW1lLnJlc29sdmUodGhpcy5waGFzZSlcbiAgICB9KTtcbiAgfVxuXG4gIHJlZHVjZVN0YXRpY1Byb3BlcnR5TmFtZSh0OiBUZXJtLCBzOiB7IHZhbHVlOiBTeW50YXggfSkge1xuICAgIHJldHVybiBuZXcgUy5TdGF0aWNQcm9wZXJ0eU5hbWUoe1xuICAgICAgdmFsdWU6IHMudmFsdWUudmFsKCkudG9TdHJpbmcoKVxuICAgIH0pO1xuICB9XG5cbiAgcmVkdWNlQmluZGluZ0lkZW50aWZpZXIodDogVGVybSwgczogeyBuYW1lOiBTeW50YXggfSkge1xuICAgIHJldHVybiBuZXcgUy5CaW5kaW5nSWRlbnRpZmllcih7XG4gICAgICBuYW1lOiBzLm5hbWUucmVzb2x2ZSh0aGlzLnBoYXNlKVxuICAgIH0pO1xuICB9XG5cbiAgcmVkdWNlU3RhdGljTWVtYmVyRXhwcmVzc2lvbih0OiBUZXJtLCBzOiB7IG9iamVjdDogYW55LCBwcm9wZXJ0eTogU3ludGF4IH0pIHtcbiAgICByZXR1cm4gbmV3IFMuU3RhdGljTWVtYmVyRXhwcmVzc2lvbih7XG4gICAgICBvYmplY3Q6IHMub2JqZWN0LFxuICAgICAgcHJvcGVydHk6IHMucHJvcGVydHkudmFsKClcbiAgICB9KTtcbiAgfVxuXG4gIHJlZHVjZUZ1bmN0aW9uQm9keSh0OiBUZXJtLCBzOiB7IHN0YXRlbWVudHM6IExpc3Q8YW55PiwgZGlyZWN0aXZlczogTGlzdDxhbnk+IH0pIHtcbiAgICByZXR1cm4gbmV3IFMuRnVuY3Rpb25Cb2R5KHtcbiAgICAgIGRpcmVjdGl2ZXM6IHMuZGlyZWN0aXZlcy50b0FycmF5KCksXG4gICAgICBzdGF0ZW1lbnRzOiBzLnN0YXRlbWVudHMudG9BcnJheSgpXG4gICAgfSk7XG4gIH1cblxuICByZWR1Y2VWYXJpYWJsZURlY2xhcmF0aW9uU3RhdGVtZW50KHQ6IFRlcm0sIHM6IHsgZGVjbGFyYXRpb246IGFueSB9KSB7XG4gICAgaWYgKHQuZGVjbGFyYXRpb24ua2luZCA9PT0gJ3N5bnRheCcgfHwgdC5kZWNsYXJhdGlvbi5raW5kID09PSAnc3ludGF4cmVjJykge1xuICAgICAgcmV0dXJuIG5ldyBTLkVtcHR5U3RhdGVtZW50KCk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgUy5WYXJpYWJsZURlY2xhcmF0aW9uU3RhdGVtZW50KHtcbiAgICAgIGRlY2xhcmF0aW9uOiBzLmRlY2xhcmF0aW9uXG4gICAgfSk7XG4gIH1cblxuICByZWR1Y2VWYXJpYWJsZURlY2xhcmF0aW9uKHQ6IFRlcm0sIHM6IHsga2luZDogYW55LCBkZWNsYXJhdG9yczogTGlzdDxhbnk+IH0pIHtcbiAgICByZXR1cm4gbmV3IFMuVmFyaWFibGVEZWNsYXJhdGlvbih7XG4gICAgICBraW5kOiBzLmtpbmQsXG4gICAgICBkZWNsYXJhdG9yczogcy5kZWNsYXJhdG9ycy50b0FycmF5KClcbiAgICB9KTtcbiAgfVxuXG4gIHJlZHVjZUNhbGxFeHByZXNzaW9uKHQ6IFRlcm0sIHM6IHsgY2FsbGVlOiBhbnksIGFyZ3VtZW50czogTGlzdDxhbnk+IH0pIHtcbiAgICByZXR1cm4gbmV3IFMuQ2FsbEV4cHJlc3Npb24oe1xuICAgICAgY2FsbGVlOiBzLmNhbGxlZSxcbiAgICAgIGFyZ3VtZW50czogcy5hcmd1bWVudHMudG9BcnJheSgpXG4gICAgfSk7XG4gIH1cblxuICByZWR1Y2VBcnJheUV4cHJlc3Npb24odDogVGVybSwgczogeyBlbGVtZW50czogTGlzdDxhbnk+IH0pIHtcbiAgICByZXR1cm4gbmV3IFMuQXJyYXlFeHByZXNzaW9uKHtcbiAgICAgIGVsZW1lbnRzOiBzLmVsZW1lbnRzLnRvQXJyYXkoKVxuICAgIH0pO1xuICB9XG5cbiAgcmVkdWNlSW1wb3J0KCkge1xuICAgIHJldHVybiBuZXcgUy5FbXB0eVN0YXRlbWVudCh7fSk7XG4gIH1cblxuICByZWR1Y2VCbG9jayh0OiBUZXJtLCBzOiB7IHN0YXRlbWVudHM6IExpc3Q8YW55PiB9KSB7XG4gICAgcmV0dXJuIG5ldyBTLkJsb2NrKHtcbiAgICAgIHN0YXRlbWVudHM6IHMuc3RhdGVtZW50cy50b0FycmF5KClcbiAgICB9KTtcbiAgfVxufVxuIl19