import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// 定义文件树结构
interface TreeNode {
    label: string;
    path: string;
    children?: TreeNode[];
    collapsibleState?: vscode.TreeItemCollapsibleState;
    isFile:boolean;
}

// 异步读取指定目录下的文件和子目录
async function readDir(dirPath: string): Promise<TreeNode[]> {
    try {
        const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const nodes: TreeNode[] = [];

        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            const node: TreeNode = {
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
    } catch (error) {
        console.error(`Error reading directory ${dirPath}: ${error}`);
        return [];
    }
}

// 关闭指定的文件窗口
async function closeTextDocumentByFilePath(filePath: string): Promise<void> {
    const visibleEditors = vscode.window.visibleTextEditors;

    for (const editor of visibleEditors) {
        if (editor.document.uri.fsPath === filePath) {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            break;
        }
    }
}

// TreeDataProvider接口的具体实现
class FileSystemTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
    private _rootPath: string;

    constructor(rootPath: string) {
        this._rootPath = rootPath;
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);
        if (element.isFile) {
            treeItem.command = { 
                command: 'note.openFile', 
                title: '', 
                arguments: [element.path] 
            };
            treeItem.contextValue = 'file';
        }
        else{
            treeItem.contextValue = 'folder';
        }
        return treeItem;
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        const pluginStorageFolder = path.join(this._rootPath);
        if (!fs.existsSync(pluginStorageFolder)) {
            fs.mkdirSync(pluginStorageFolder);
        }

        if (!element) {
            return readDir(pluginStorageFolder);
        } else {
            return element.children ?? [];
        }
    }
}

// 激活函数
export function activate(context: vscode.ExtensionContext) {
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
    vscode.commands.registerCommand('note.openFile', async (path: string) => {
        try {
            await vscode.workspace.openTextDocument(path)
            .then(file => {
                vscode.window.showTextDocument(file);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`无法打开文件: ${error}`);
        }
    });

    // 获取选中文本逻辑
    vscode.commands.registerCommand('note.getSelectedText', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            if(!activeEditor.selection.isEmpty){
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
                        vscode.window.setStatusBarMessage(`😀😀😀创建笔记成功!!!`,5000);
                    });
                }
            }
            else{
                vscode.window.setStatusBarMessage(`😔😔😔错误:无法保存空文本!!!`,5000);
            }
        }
    });

    // 创建笔记
    vscode.commands.registerCommand('note.createFile', async (node: TreeNode) => {
        const fileName = await vscode.window.showInputBox({
            prompt: '请输入笔记名:',
            placeHolder: '例如:python快速排序算法',
        })

        if(fileName){
            fs.writeFile(`${node?node.path:rootPath}/${fileName}.txt`, '', 'utf8', (error) => {
                if (error) {
                    vscode.window.showErrorMessage(`创建笔记失败${error}`);
                    return;
                }
                const fileSystemTreeDataProvider = new FileSystemTreeDataProvider(rootPath);
                vscode.window.registerTreeDataProvider('folderView', fileSystemTreeDataProvider);
                vscode.window.setStatusBarMessage(`😀😀😀创建笔记成功!!!`,5000);
            });
        }
    });

    // 创建笔记集合
    vscode.commands.registerCommand('note.createFolder', async (node: TreeNode) => {
        const folderName = await vscode.window.showInputBox({
            prompt: '请输入笔记集合名:',
            placeHolder: '例如:python',
        })

        if(folderName){
            fs.mkdir(`${node?node.path:rootPath}/${folderName}`, (error) => {
                if (error) {
                    vscode.window.showErrorMessage(`创建笔记集合失败${error}`);
                    return;
                }
                const fileSystemTreeDataProvider = new FileSystemTreeDataProvider(rootPath);
                vscode.window.registerTreeDataProvider('folderView', fileSystemTreeDataProvider);
                vscode.window.setStatusBarMessage(`😀😀😀创建笔记集合成功!!!`,5000);
            })
        }
    });

    // 复制名称
    vscode.commands.registerCommand('note.copyName', (node: TreeNode) => {
        vscode.env.clipboard.writeText(node.label);
        vscode.window.setStatusBarMessage(`😀😀😀复制名称成功!!!`,5000);
    })

    // 复制内容
    vscode.commands.registerCommand('note.copyFile', (node: TreeNode) => {
        fs.readFile(node.path, 'utf8', (error, data) => {
            if (error) {
                vscode.window.showErrorMessage(`无法读取文件: ${error}`);
                return;
            }
            vscode.env.clipboard.writeText(data);
            vscode.window.setStatusBarMessage(`😀😀😀复制内容成功!!!`,5000);
        })
    })

    // 删除
    vscode.commands.registerCommand('note.delete', (node: TreeNode) => {
        fs.unlink(node.path, (error) => {
            if (error) {
                vscode.window.showErrorMessage(`无法删除文件: ${error}`);
                return;
            }
            const fileSystemTreeDataProvider = new FileSystemTreeDataProvider(rootPath);
            vscode.window.registerTreeDataProvider('folderView', fileSystemTreeDataProvider);
            vscode.window.setStatusBarMessage(`😀😀😀删除成功!!!`,5000);
        })
    })

    // 重命名
    vscode.commands.registerCommand('note.rename', async (node: TreeNode) => {
        const newName = await vscode.window.showInputBox({
            prompt: '请输入新的命名:',
            placeHolder: node.label,
        })

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
                        vscode.window.setStatusBarMessage(`😀😀😀重命名成功!!!`,5000);
                    });
                } catch (error) {
                    vscode.window.showErrorMessage(`无法打开文件: ${error}`);
                }
                const fileSystemTreeDataProvider = new FileSystemTreeDataProvider(rootPath);
                vscode.window.registerTreeDataProvider('folderView', fileSystemTreeDataProvider);
            })
        }
    })
}

// 退出函数
export function deactivate() {}