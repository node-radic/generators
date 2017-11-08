//region: IMPORTS
import * as gulp from 'gulp';
import { WatchEvent } from 'gulp';
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
const pump             = require('pump')
const DependencySorter = require('dependency-sorter')
//endregion


//region: DEFINITIONS
type TSProjectOptions = Settings & ts.CompilerOptions
type IdeaBoolean = 'true' | 'false'

interface IdeaIml {
    module: {
        $: { type: string, version: string },
        component: Array<{
            '$': { 'name': string, 'inherit-compiler-output': IdeaBoolean },
            'exclude-output'?: any[],
            'content'?: Array<{
                '$': { 'url': string },
                'sourceFolder'?: Array<{
                    '$': { 'url': string, 'isTestSource'?: IdeaBoolean }
                }>,
                'excludeFolder'?: Array<{ '$': { 'url': string } }>
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

interface IdeaJsMappings {
    'project': {
        '$': { 'version': string },
        'component': Array<{
            '$': { 'name': 'JavaScriptLibraryMappings' },
            'file': Array<{
                '$': { 'url': 'PROJECT' | 'GLOBAL', 'libraries': string }
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


//region: TASKS:INTELLIJ
gulp.task('idea', (cb) => {
    const url       = (...parts: any[]) => [ 'file://$MODULE_DIR$/' ].concat(join.apply(null, parts)).join('')
    let editIml     = existsSync(resolve('.idea/libraries/tsconfig_roots.xml')),
          editJsMap = existsSync(resolve('.idea/jsLibraryMappings.xml'));

    if ( editIml || editJsMap ) {
        const xmlEdit = require('gulp-edit-xml')
        /** @link https://github.com/t1st3/muxml#options **/
        const muxml   = require('gulp-muxml')
        if ( editIml ) {
            const getDirs = (name: string, filter: (path: string) => boolean): string[] => packages
                .map(pkg => pkg.path.to(name))
                .filter(path => {
                    return existsSync(path)
                })
                .filter(path => {
                    return statSync(path).isDirectory()
                })
                .map(path => {
                    path = url(path.replace(__dirname, ''))
                    return path
                })
                .filter(filter)

            gulp.src('.idea/*.iml')
                .pipe(xmlEdit((xml: IdeaIml) => {
                    // remote tsconfig$roots
                    xml.module.component[ 0 ].orderEntry = xml.module.component[ 0 ].orderEntry.filter(entry => entry.$.name !== 'tsconfig$roots')
                    const content                        = xml.module.component[ 0 ].content[ 0 ];
                    content.excludeFolder                = content.excludeFolder || []
                    content.sourceFolder                 = content.sourceFolder || []
                    const excludeFolders: string[]       = content.excludeFolder.map(sf => sf.$.url)
                    const sourceFolders: string[]        = content.sourceFolder.map(sf => sf.$.url)

                    // ensure we exclude all types folders
                    getDirs('types', path => ! excludeFolders.includes(path)).forEach(url => {
                        content.excludeFolder.push({ $: { url } })
                    })

                    // ensure we test all test folders
                    getDirs('test', path => ! sourceFolders.includes(path)).forEach(url => {
                        content.sourceFolder.push({ $: { url, isTestSource: 'true' } })
                    })

                    // ensure we source all src folders
                    getDirs('src', path => ! sourceFolders.includes(path)).forEach(url => {
                        content.sourceFolder.push({ $: { url, isTestSource: 'false' } })
                    })
                    return xml;
                }))
                .pipe(muxml({ identSpaces: 2 }))
                .pipe(gulp.dest('.idea/'))
        }
        if ( editJsMap ) {

            // noinspection TypeScriptUnresolvedFunction
            gulp.src('.idea/jsLibraryMappings.xml')
                .pipe(xmlEdit((xml: IdeaJsMappings) => {
                    // if(xml.project.component.length > 0) {
                    if ( xml.project.component[ 0 ].file[ 0 ].$.libraries.includes('tsconfig$roots') ) {
                        xml.project.component[ 0 ].file[ 0 ].$.libraries = xml.project.component[ 0 ].file[ 0 ].$.libraries
                            .replace(', tsconfig$roots', '')
                            .replace('tsconfig$roots, ', '')
                            .replace('tsconfig$roots', '')
                    }
                    return xml;
                }))
                .pipe(muxml({ identSpaces: 2 }))
                .pipe(gulp.dest('.idea/'))
        }
    }
    cb();
})
//endregion


//region: TASKS:TYPESCRIPT
let srcNames       = []
let testNames      = []
const createTsTask = (name, pkg, dest, tsProject: TSProjectOptions = {}) => {
    let proj        = gts.createProject(pkg.path.to('tsconfig.json'));
    let cleanPaths  = [ proj.options.declarationDir ]
        .concat(
            globule
                .find(join(pkg.path.to('src'), '**/*'))
                .filter(path => statSync(path).isDirectory())
                .map(path => path.replace(pkg.path.to('src'), pkg.path))
        )
        .concat(globule.find(join(pkg.path.to('*.js'))));
    let hasTests    = existsSync(pkg.path.to('test'));
    let returnNames = [ name ];

    gulp.task('clean:' + name, (cb) => {
        pump(gulp.src(cleanPaths), clean(), (err) => cb(err))
    });
    // const tsconfig = _.merge(c.ts.defaults, tsProject)
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
    gulp.task('watch:' + name, () => {
        gulp.watch([ pkg.path.to('src/**/*.ts'), pkg.path.to('test/**/*.ts') ], (event: WatchEvent) => {
            // let directory = dirname(event.path.replace(resolve(__dirname, 'packages'), ''));
            gulp.start('build:' + name, 'idea')
        })
    });
    srcNames.push(name)

    if ( hasTests ) {
        gulp.task(`clean:${name}:test`, (cb) => {
            pump(gulp.src(pkg.path.to('test/**/*.js')), clean(), (err) => cb(err))
        });
        gulp.task(`build:${name}:test`, (cb) => {
            let testProject = gts.createProject(pkg.path.to('tsconfig.json'), <TSProjectOptions> {
                declaration: false, outDir: './test'
            });
            delete testProject.options.declarationDir
            gulp.src(pkg.path.to('test/**/*.ts'))
                .pipe(testProject())
                .pipe(gulp.dest(pkg.path.to('test')))
        })
        gulp.task(`watch:${name}:test`, () => {
            gulp.watch(pkg.path.to('test/**/*.ts'), (event: WatchEvent) => {
                gulp.start(`build:${name}:test`)
            })
        });
        testNames.push(`${name}:test`);
    }
}
packages.forEach(pkg => createTsTask(`${c.ts.taskPrefix}:${pkg.directory}`, pkg, '/', {}));
[ 'build', 'clean', 'watch' ].forEach(prefix => gulp.task(`${prefix}:ts`, srcNames.map(name => `${prefix}:${name}`)));
[ 'build', 'clean', 'watch' ].forEach(prefix => gulp.task(`${prefix}:ts:test`, testNames.map(name => `${prefix}:${name}`)));

//     srcNames.map()
//     let subTasks = []
//     tsTasks.forEach(names => names.forEach(name => subTasks.push(`${prefix}:${name}`)))
//     console.dir({prefix, subTasks, tsTasks})
//     gulp.task(`${prefix}:ts`, subTasks)
// });
// const tsTasks      = packages.map(pkg => createTsTask(`${c.ts.taskPrefix}:${pkg.directory}`, pkg, '/', {}));
// [ 'build', 'clean', 'watch' ].forEach(prefix => gulp.task(`${prefix}:ts`, tsTasks.map(name => `${prefix}:${name}`)));
//endregion


//region: MAIN TASKS
gulp.task('clean', [ `clean:${c.ts.taskPrefix}`, `clean:${c.ts.taskPrefix}:test` ])
gulp.task('build', [ 'clean' ], () => gulp.start(`build:${c.ts.taskPrefix}`, `build:${c.ts.taskPrefix}:test`, 'idea'))
gulp.task('watch', [ 'build' ], () => gulp.start(`watch:${c.ts.taskPrefix}`, `watch:${c.ts.taskPrefix}:test`))
gulp.task('default', [ 'build' ])
//endregion


// always run the IntelliJ IDEA fixer
gulp.start('idea')


// let this run by itself
const baseNames = process.argv.slice(0, 2).map(p => basename(p));
console.dir(process.argv.slice(2))
if ( baseNames[ 0 ] === 'node' && baseNames[ 1 ] === 'gulpfile.ts' ) {
    gulp.start.apply(gulp, process.argv.slice(2))
}


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


//
// import BasePublishCommand from 'lerna/lib/commands/PublishCommand.js'
// class PublishCommand extends BasePublishCommand {
//
// }
//
// import CLI from 'lerna/lib/cli.js'
// Yar
// CLI()
//
// console.dir(PublishCommand)