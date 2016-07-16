'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.default = function (_ref) {
  var t = _ref.types;

  return {
    visitor: {
      CallExpression: function CallExpression(path, state) {
        if (path.node.callee.name !== 'require') {
          return;
        }
        var args = path.node.arguments;
        if (!args.length) {
          return;
        }

        var config = extractConfig(state);

        var sourcePath = state.file.opts.filename;

        if (sourcePath === 'unknown') {
          return;
        }

        invariants(config);

        var firstArg = traverseExpression(t, args[0]);
        var importPath = firstArg.value.raw || firstArg.value;
        if (isImportPathPrefixed(importPath, config.importPathPrefix)) {
          var newValue = getNewValue(config, sourcePath, importPath);
          newValue += importPath === config.importPathPrefix ? '/' : '';
          if (_typeof(firstArg.value) === 'object') {
            firstArg.value.raw = newValue;
            firstArg.value.cooked = newValue;
          } else {
            firstArg.value = newValue;
          }
        }
      },
      ImportDeclaration: function ImportDeclaration(path, state) {
        // config: {
        //   projectRoot: babel option sourceRoot or process.cwd as fallback
        //   importPathPrefix: import path prefix provided by the user in the plugin config
        //   sourceDir: source directory provided by the user in the plugin config
        // }
        var config = extractConfig(state);

        // File currently visited
        var sourcePath = state.file.opts.filename;

        if (sourcePath === 'unknown') {
          return;
        }

        invariants(config);

        // Path in the import statement
        var importPath = path.node.source.value;

        if (isImportPathPrefixed(importPath, config.importPathPrefix)) {
          path.node.source.value = getNewValue(config, sourcePath, importPath);
        }
      }
    }
  };
};

var _path = require('path');

var _slash = require('slash');

var _slash2 = _interopRequireDefault(_slash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function traverseExpression(t, arg) {
  if (t.isStringLiteral(arg)) {
    return arg;
  }
  if (t.isBinaryExpression(arg)) {
    return traverseExpression(t, arg.left);
  }
  if (t.isTemplateLiteral(arg)) {
    return traverseExpression(t, arg.quasis[0]);
  }
  if (t.isTemplateElement(arg)) {
    return arg;
  }
  return null;
}

function getNewValue(config, sourcePath, importPath) {
  var absoluteImportPath = getAbsoluteImportPath(importPath, config);
  var absoluteSourcePath = getAbsoluteSourcePath(config.projectRoot, sourcePath);
  var relativeImportPath = (0, _path.relative)((0, _path.dirname)(absoluteSourcePath), absoluteImportPath);
  console.log(importPath, absoluteImportPath, absoluteSourcePath, relativeImportPath);
  return './' + (0, _slash2.default)(relativeImportPath);
}

function extractConfig(state) {
  return {
    projectRoot: state.file.opts.sourceRoot || process.cwd(),
    importPathPrefix: state.opts.importPathPrefix || '~/',
    sourceDir: state.opts.sourceDir || ''
  };
}

function invariants(state) {
  if (typeof state.sourceDir !== 'string') {
    throw new Error('The "sourceDir" provided is not a string');
  }

  if (typeof state.importPathPrefix !== 'string') {
    throw new Error('The "importPathPrefix" provided is not a string');
  }
}

function isImportPathPrefixed(targetPath, prefix) {
  return targetPath.lastIndexOf(prefix, 0) === 0;
}

function getAbsoluteImportPath(importPath, config) {
  var importPathWithoutPrefix = importPath.substring(config.importPathPrefix.length);
  var suffixedProjectPath = (0, _path.join)(config.projectRoot, config.sourceDir);

  return (0, _path.join)(suffixedProjectPath, importPathWithoutPrefix);
}

function getAbsoluteSourcePath(projectRoot, sourcePath) {
  // Some babel wrappers supply an absolute path already
  // so we need to check for that.
  if ((0, _path.isAbsolute)(sourcePath)) {
    return sourcePath;
  } else {
    return (0, _path.join)(projectRoot, sourcePath);
  }
}