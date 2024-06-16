/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(__webpack_require__(1));
const fs = __importStar(__webpack_require__(2));
const path = __importStar(__webpack_require__(3));
// 异步读取指定目录下的文件和子目录
async function readDir(dirPath) {
    try {
        const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const nodes = [];
        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            const node = {
                label: file.isDirectory() ? file.name : file.name.split('.').slice(0, -1).join('.'),
                path: filePath,
                collapsibleState: file.isDirectory()
                    ? vscode.TreeItemCollapsibleState.Collapsed
                    : vscode.TreeItemCollapsibleState.None,
                isFile: !file.isDirectory(),
            };
            if (file.isDirectory()) {
                node.children = await readDir(filePath);
            }
            nodes.push(node);
        }
        nodes.sort((a, b) => (a.isFile === b.isFile) ? 0 : (a.isFile ? 1 : -1));
        return nodes;
    }
    catch (error) {
        console.error(`Error reading directory ${dirPath}: ${error}`);
        return [];
    }
}
// 关闭指定的文件窗口
async function closeTextDocumentByFilePath(filePath) {
    const visibleEditors = vscode.window.visibleTextEditors;
    for (const editor of visibleEditors) {
        if (editor.document.uri.fsPath === filePath) {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            break;
        }
    }
}
// TreeDataProvider接口的具体实现
class FileSystemTreeDataProvider {
    _rootPath;
    constructor(rootPath) {
        this._rootPath = rootPath;
    }
    getTreeItem(element) {
        const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);
        if (element.isFile) {
            treeItem.command = {
                command: 'note.openFile',
                title: '',
                arguments: [element.path]
            };
            treeItem.contextValue = 'file';
        }
        else {
            treeItem.contextValue = 'folder';
        }
        return treeItem;
    }
    async getChildren(element) {
        const pluginStorageFolder = path.join(this._rootPath);
        if (!fs.existsSync(pluginStorageFolder)) {
            fs.mkdirSync(pluginStorageFolder);
        }
        if (!element) {
            return readDir(pluginStorageFolder);
        }
        else {
            return element.children ?? [];
        }
    }
}
// 激活函数
function activate(context) {
    const rootPath = context.globalStorageUri.fsPath;
    // 文件视图数据提供
    const fileSystemTreeDataProvider = new FileSystemTreeDataProvider(rootPath);
    vscode.window.registerTreeDataProvider('folderView', fileSystemTreeDataProvider);
    // 命令打开笔记本
    vscode.commands.registerCommand('note.fastnote', () => {
        vscode.commands.executeCommand('workbench.view.extension.container');
    });
    // 右键打开笔记本
    vscode.commands.registerCommand('note.openNote', () => {
        vscode.commands.executeCommand('workbench.view.extension.container');
    });
    // 打开笔记内容
    vscode.commands.registerCommand('note.openFile', async (path) => {
        try {
            await vscode.workspace.openTextDocument(path)
                .then(file => {
                vscode.window.showTextDocument(file);
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`无法打开文件: ${error}`);
        }
    });
    // 获取选中文本逻辑
    vscode.commands.registerCommand('note.getSelectedText', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            if (!activeEditor.selection.isEmpty) {
                const selectedText = activeEditor.document.getText(activeEditor.selection);
                const userInput = await vscode.window.showInputBox({
                    prompt: '请输入笔记名:',
                    placeHolder: '例如:python快速排序算法',
                });
                if (userInput) {
                    fs.writeFile(`${rootPath}/${userInput}.txt`, selectedText, 'utf8', (error) => {
                        if (error) {
                            vscode.window.showErrorMessage(`创建笔记失败${error}`);
                            return;
                        }
                        const fileSystemTreeDataProvider = new FileSystemTreeDataProvider(rootPath);
                        vscode.window.registerTreeDataProvider('folderView', fileSystemTreeDataProvider);
                        vscode.window.setStatusBarMessage(`😀😀😀创建笔记成功!!!`, 5000);
                    });
                }
            }
            else {
                vscode.window.setStatusBarMessage(`😔😔😔错误:无法保存空文本!!!`, 5000);
            }
        }
    });
    // 创建笔记
    vscode.commands.registerCommand('note.createFile', async (node) => {
        const fileName = await vscode.window.showInputBox({
            prompt: '请输入笔记名:',
            placeHolder: '例如:python快速排序算法',
        });
        if (fileName) {
            fs.writeFile(`${node ? node.path : rootPath}/${fileName}.txt`, '', 'utf8', (error) => {
                if (error) {
                    vscode.window.showErrorMessage(`创建笔记失败${error}`);
                    return;
                }
                const fileSystemTreeDataProvider = new FileSystemTreeDataProvider(rootPath);
                vscode.window.registerTreeDataProvider('folderView', fileSystemTreeDataProvider);
                vscode.window.setStatusBarMessage(`😀😀😀创建笔记成功!!!`, 5000);
            });
        }
    });
    // 创建笔记集合
    vscode.commands.registerCommand('note.createFolder', async (node) => {
        const folderName = await vscode.window.showInputBox({
            prompt: '请输入笔记集合名:',
            placeHolder: '例如:python',
        });
        if (folderName) {
            fs.mkdir(`${node ? node.path : rootPath}/${folderName}`, (error) => {
                if (error) {
                    vscode.window.showErrorMessage(`创建笔记集合失败${error}`);
                    return;
                }
                const fileSystemTreeDataProvider = new FileSystemTreeDataProvider(rootPath);
                vscode.window.registerTreeDataProvider('folderView', fileSystemTreeDataProvider);
                vscode.window.setStatusBarMessage(`😀😀😀创建笔记集合成功!!!`, 5000);
            });
        }
    });
    // 复制名称
    vscode.commands.registerCommand('note.copyName', (node) => {
        vscode.env.clipboard.writeText(node.label);
        vscode.window.setStatusBarMessage(`😀😀😀复制名称成功!!!`, 5000);
    });
    // 复制内容
    vscode.commands.registerCommand('note.copyFile', (node) => {
        fs.readFile(node.path, 'utf8', (error, data) => {
            if (error) {
                vscode.window.showErrorMessage(`无法读取文件: ${error}`);
                return;
            }
            vscode.env.clipboard.writeText(data);
            vscode.window.setStatusBarMessage(`😀😀😀复制内容成功!!!`, 5000);
        });
    });
    // 删除
    vscode.commands.registerCommand('note.delete', (node) => {
        fs.unlink(node.path, (error) => {
            if (error) {
                vscode.window.showErrorMessage(`无法删除文件: ${error}`);
                return;
            }
            const fileSystemTreeDataProvider = new FileSystemTreeDataProvider(rootPath);
            vscode.window.registerTreeDataProvider('folderView', fileSystemTreeDataProvider);
            vscode.window.setStatusBarMessage(`😀😀😀删除成功!!!`, 5000);
        });
    });
    // 重命名
    vscode.commands.registerCommand('note.rename', async (node) => {
        const newName = await vscode.window.showInputBox({
            prompt: '请输入新的命名:',
            placeHolder: node.label,
        });
        if (newName) {
            closeTextDocumentByFilePath(node.path);
            const newPath = node.path.replace(node.label, newName);
            fs.rename(node.path, newPath, async (error) => {
                if (error) {
                    vscode.window.showErrorMessage(`无法重命名文件: ${error}`);
                    return;
                }
                try {
                    await vscode.workspace.openTextDocument(newPath)
                        .then(file => {
                        vscode.window.showTextDocument(file);
                        vscode.window.setStatusBarMessage(`😀😀😀重命名成功!!!`, 5000);
                    });
                }
                catch (error) {
                    vscode.window.showErrorMessage(`无法打开文件: ${error}`);
                }
                const fileSystemTreeDataProvider = new FileSystemTreeDataProvider(rootPath);
                vscode.window.registerTreeDataProvider('folderView', fileSystemTreeDataProvider);
            });
        }
    });
}
exports.activate = activate;
// 退出函数
function deactivate() { }
exports.deactivate = deactivate;


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("path");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map