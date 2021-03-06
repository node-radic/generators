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
import { exec } from 'child_process';

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
    idea : true,
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
if(c.idea) {
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
}
//endregion


//region: TASKS:TYPESCRIPT
// the package task prefix names for src (populates by createTsTask() calls)
// - used to afterwards create [clean,build,watch]:ts:${packageName} task name array
// - and uses the array as dependencies for creation of [clean,build,watch]:ts tasks
let srcNames = []
// the package task prefix names for test works same as src but
// creates [clean,build,watch]:ts:test:${packageName} task name array for the [clean,build,watch]:ts:test tasks
let testNames      = []
const createTsTask = (name, pkg, dest, tsProject: TSProjectOptions = {}) => {

    //region: clean, build and watch tasks for the src directory
    // need to manually set up clean paths because the src directory will be compiled into its parent directory, the package root
    // we can not just delete all directories in the package root (obvious)
    // - gets the declaration dir name > prefixes package root path > cleanPaths
    // - gets src dir names > prefixes package root path > cleanPaths
    // - gets src dir root .js file names > prefixes package root path > cleanPaths
    let cleanPaths = [ pkg.path.to(require(pkg.path.to('tsconfig.json')).compilerOptions.declarationDir) ]
        .concat(
            globule
                .find(join(pkg.path.to('src'), '**/*'))
                .filter(path => statSync(path).isDirectory())
                .map(path => path.replace(pkg.path.to('src'), pkg.path))
        )
        .concat(globule.find(join(pkg.path.to('*.js'))));

    gulp.task('clean:' + name, (cb) => { pump(gulp.src(cleanPaths), clean(), (err) => cb(err)) });
    gulp.task('build:' + name, (cb) => { exec(resolve('node_modules/.bin/tsc'), { cwd: pkg.path + '' }).on('exit', () => cb()) })
    gulp.task('watch:' + name, () => {
        gulp.watch([ pkg.path.to('src/**/*.ts'), pkg.path.to('test/**/*.ts') ], (event: WatchEvent) => {
            gulp.start('build:' + name, 'idea')
        })
    });
    srcNames.push(name)
    //endregion


    let hasTests = existsSync(pkg.path.to('test'));
    //region: clean, build and watch tasks for the test directory
    if ( hasTests ) {
        gulp.task(`clean:${name}:test`, (cb) => { pump(gulp.src(pkg.path.to('test/**/*.js')), clean(), (err) => cb(err)) });
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
    //endregion
}
packages.forEach(pkg => createTsTask(`${c.ts.taskPrefix}:${pkg.directory}`, pkg, '/', {}));
[ 'build', 'clean', 'watch' ].forEach(prefix => gulp.task(`${prefix}:ts`, srcNames.map(name => `${prefix}:${name}`)));
[ 'build', 'clean', 'watch' ].forEach(prefix => gulp.task(`${prefix}:ts:test`, testNames.map(name => `${prefix}:${name}`)));
//endregion


//region: MAIN TASKS
gulp.task('clean', [ `clean:${c.ts.taskPrefix}`, `clean:${c.ts.taskPrefix}:test` ])
gulp.task('build', [ 'clean' ], () => gulp.start(`build:${c.ts.taskPrefix}`, `build:${c.ts.taskPrefix}:test`, 'idea'))
gulp.task('watch', [ 'build' ], () => gulp.start(`watch:${c.ts.taskPrefix}`, `watch:${c.ts.taskPrefix}:test`))
gulp.task('default', [ 'build' ])
//endregion

if(c.idea) {
// always run the IntelliJ IDEA fixer
    gulp.start('idea')
}