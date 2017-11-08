//region: IMPORTS
import * as gulp from 'gulp';
import * as gts from 'gulp-typescript';
import { Settings } from 'gulp-typescript';
import * as ts from 'typescript';
// noinspection ES6UnusedImports
import * as shelljs from 'shelljs';
import * as globule from 'globule';
import { basename, join, resolve } from 'path';
import * as _ from 'lodash';
import { existsSync, statSync } from 'fs';
import { execSync } from 'child_process';

const clean            = require('gulp-clean')
const DependencySorter = require('dependency-sorter')
//endregion


//region: DEFINITIONS
type TSProjectOptions = Settings & ts.CompilerOptions
type IdeaBoolean = 'true' | 'false'

interface IdeaIml {
    module: {
        $: { type: string, version: string },
        component: Array<{
            '$': {
                'name': string,
                'inherit-compiler-output': IdeaBoolean
            },
            'exclude-output'?: any[],
            'content'?: Array<{
                '$': {
                    'url': string
                },
                'sourceFolder'?: Array<{
                    '$': {
                        'url': string,
                        'isTestSource'?: IdeaBoolean
                    }
                }>,
                'excludeFolder'?: Array<{
                    '$': {
                        'url': string
                    }
                }>
            }>,
            'orderEntry'?: Array<{
                '$': {
                    'type'?: 'library' | 'sourceFolder' | 'inheritedJdk',
                    'name'?: string,
                    'level'?: 'project' | 'global' | 'scope',
                    'forTests'?: IdeaBoolean
                }
            }>
        }>
    }
}
//endregion


//region: CONFIG
const c = {
    pkg  : require('./package.json'),
    lerna: require('./lerna.json'),
    ts   : {
        config    : require('./tsconfig.json'),
        taskPrefix: 'ts',
        defaults  : <TSProjectOptions>{
            typescript     : ts,
            // declaration    : true,
            inlineSourceMap: false,
            inlineSources  : false
        }
    }
};
//endregion


//region: RESOLVE PACKAGES
const packagePaths = globule
    .find('packages/*')
    .map(path => resolve(path))
    .filter(path => statSync(path).isDirectory());
// noinspection ReservedWordAsName
const packages     = new DependencySorter({ idProperty: 'name' }).sort(
    packagePaths.map(path => {
        const pkg = require(resolve(path, 'package.json'))
        return {
            path        : {
                toString: () => resolve(path),
                to      : (...args: string[]) => resolve.apply(null, [ path ].concat(args)),
                glob    : (pattern: string | string[]) => _.toArray(pattern).map(pattern => resolve(path, pattern))
            },
            directory   : basename(path),
            package     : pkg,
            name        : pkg.name,
            tsconfig    : require(resolve(path, 'tsconfig.json')),
            depends     : Object.keys(pkg.dependencies),
            dependencies: pkg.dependencies
        }
    })
);
const packageNames = packages.map(pkg => pkg.name);
//endregion


//region: TASKS:TYPESCRIPT
const createTsTask = (name, pkg, dest, tsProject: TSProjectOptions = {}) => {
    let proj  = gts.createProject(pkg.path.to('tsconfig.json'));
    let paths = [ proj.options.declarationDir ]
        .concat(
            globule
                .find(join(pkg.path.to('src'), '**/*'))
                .filter(path => statSync(path).isDirectory())
                .map(path => path.replace(pkg.path.to('src'), pkg.path))
        )
        .concat(globule.find(join(pkg.path.to('*.js'))))


    gulp.task('clean:' + name, (cb) => gulp.src(paths).pipe(clean()).on('finish', () => cb()));
    const tsconfig = _.merge(c.ts.defaults, tsProject)
    // const tsconfigc      = _.clone(tsconfig)
    // tsconfigc.typescript = null
    // console.log({ dest: pkg.path + '', src: pkg.path.to('src/**/*.ts'), tsconfigc })
    gulp.task('build:' + name, (cb) => {
        execSync(resolve('node_modules/.bin/tsc'), { cwd: pkg.path + '' })
        cb()
        // pump(
        //     gulp.src(pkg.path.to('src/**/*.ts')),
        //     gts.createProject(pkg.path.to('tsconfig.json'), tsconfig)(),
        //     gulp.dest(pkg.path+''),
        //     cb
        // )
    })
    return name;
}
const tsTasks      = packages.map(pkg => createTsTask(`${c.ts.taskPrefix}:${pkg.directory}`, pkg, '/', {}));
[ 'build', 'clean' ].forEach(prefix => gulp.task(`${prefix}:ts`, tsTasks.map(name => `${prefix}:${name}`)));
//endregion


//region: TASKS:INTELLIJ
gulp.task('idea', (cb) => {
    const url   = (...parts: any[]) => join.apply(null, [ 'file://$MODULE_DIR$/' ].concat(parts))
    let editIml = false, editJsMap = false;
    if ( existsSync(resolve('.idea/libraries/tsconfig_roots.xml')) ) {
        editIml = true
        // gulp.src('.idea/libraries/tsconfig_roots.xml').pipe(clean())
    }
    if ( existsSync(resolve('.idea/jsLibraryMappings.xml')) ) {
        editIml = true
        // edit resolve('.idea/jsLibraryMappings.xml')
    }
    if ( editIml || editJsMap ) {
        const xmlEdit = require('gulp-edit-xml')
        /** @link https://github.com/t1st3/muxml#options **/
        const muxml   = require('gulp-muxml')
        if ( editIml ) {
            const sourceFolders  = packages.map(pkg => pkg.path.to('src'))
            const excludeFolders = packages.map(pkg => pkg.path.to('typings'))
            gulp
                .src('.idea/*.iml')
                .pipe(xmlEdit((xml: IdeaIml) => {
                    // remote tsconfig$roots
                    xml.module.component[ 0 ].orderEntry = xml.module.component[ 0 ].orderEntry.filter(entry => entry.$.name !== 'tsconfig$roots')

                    // ensure we exclude all types folders
                    const excludeFolders = xml.module.component[ 0 ].content[ 0 ].excludeFolder.map(sf => sf.$.url)
                    packages.map(pkg => pkg.path.to('types')).filter(url => excludeFolders.includes(url)).forEach(url => {
                        xml.module.component[ 0 ].content[ 0 ].excludeFolder.push({ $: { url } })
                    })

                    // ensure we source all src folders
                    const sourceFolders = xml.module.component[ 0 ].content[ 0 ].sourceFolder.map(sf => sf.$.url)
                    packages.map(pkg => pkg.path.to('src')).filter(url => sourceFolders.includes(url)).forEach(url => {
                        xml.module.component[ 0 ].content[ 0 ].sourceFolder.push({ $: { url, isTestSource: 'false' } })
                    })
                    return xml;
                }))
                .pipe(muxml({ identSpaces: 2 }))
                .pipe(gulp.dest('.idea/'))
        }
    }
    cb();
})
//endregion


//region: MAIN TASKS
gulp.task('clean', [ `clean:${c.ts.taskPrefix}` ])
gulp.task('build', [ 'clean', `build:${c.ts.taskPrefix}` ])
gulp.task('default', [ 'build' ])
//endregion


// always run the IntelliJ IDEA fixer
gulp.start('idea')


// createTsTask(`ts:${pkg.name}:es`, pkg, 'es', { declaration: true, declarationDir: 'types', target: ts.ScriptTarget.ES5, module: ts.ModuleKind.ES2015 });
// [ 'build', 'clean' ].forEach(prefix => gulp.task(`${prefix}:ts:${pkg.name}`, [
//     `${prefix}:ts:${pkg.name}:lib`,
//     `${prefix}:ts:${pkg.name}:es`
// ]));
// gulp.start('clean:ts')
// gulp.src([
//     '.idea/libraries/tsconfig_roots.xml',
//     '.idea/jsLibraryMappings.xml'
// ]).pipe(clean())