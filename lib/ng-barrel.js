'use babel';
import { CompositeDisposable } from 'atom';
import * as fs from 'fs';
import * as path from 'path';

function walkSync(dir, filelist) {
    filelist = filelist || [];
    if (dir[dir.length - 1] !== '/') {
        dir = dir.concat('/');
    }
    const files = fs.readdirSync(dir);
    files.forEach((file: string) => {
        if (fs.statSync(dir + file).isDirectory()) {
            filelist = walkSync(dir + file + path.sep, filelist);
        } else {
            filelist.push(dir + file);
        }
    });
    return filelist;
}

export default {
    ngBarrelView: null,
    modalPanel: null,
    subscriptions: null,

    activate(state) {
        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(
            atom.commands.add('atom-workspace', {
                'ng-barrel:barrelTypescript': () => this.barrelTypescript(),
                'ng-barrel:barrelAll': () => this.barrelAll()
            })
        );
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    process(fileType) {
        const rootDir = this.getActiveFilePath();
        const isDirectory = fs.statSync(rootDir).isDirectory();
        if (!isDirectory) {
            return false;
        }
        const files = walkSync(rootDir)
            .filter(file => {
                return (
                    new RegExp(`${fileType}$`).test(file) &&
                    !/index\.ts$/.test(file)
                );
            })
            .sort((a, b) => {
                return path.basename(a) > path.basename(b) ? 1 : -1;
            })
            .map(file => {
                return file.replace(rootDir, '').replace(/\.ts$/, '');
            })
            .map(file => {
                return `export * from '.${file}';`;
            })
            .join('\n');
        if (files !== '') {
            const indexFile = `${rootDir}${path.sep}index.ts`;
            const hasIndexFile = fs.existsSync(indexFile);
            const currentFileContents = hasIndexFile
                ? fs.readFileSync(indexFile, 'utf8')
                : '// ng-barrel\n\n';
            const output = currentFileContents
                .replace(/([\s\S]*\/\/ ?ng-barrel)([\s\S]*)/gm, '$1\n\n')
                .concat(files);
            fs.writeFileSync(indexFile, output);
        }
        return true;
    },
    barrelTypescript() {
        return this.process('^(?!.*?spec).*\\.ts');
    },
    barrelAll() {
        return this.process('.');
    },
    getActiveFilePath() {
        var ref, ref1, ref2, ref3;
        return (
            ((ref = document.querySelector('.tree-view .selected')) != null
                ? typeof ref.getPath === 'function' ? ref.getPath() : void 0
                : void 0) ||
            ((ref1 = atom.workspace.getActivePaneItem()) != null
                ? (ref2 = ref1.buffer) != null
                  ? (ref3 = ref2.file) != null ? ref3.path : void 0
                  : void 0
                : void 0)
        );
    }
};
