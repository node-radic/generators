import * as gulp from 'gulp';
import * as gts from 'gulp-typescript';
import { Settings } from 'gulp-typescript';
import * as ts from 'typescript';
// noinspection ES6UnusedImports
import * as shelljs from 'shelljs';
import * as globule from 'globule';
import { basename, resolve } from 'path';
import * as _ from 'lodash';
import * as pump from 'pump';

const clean = require('gulp-clean')

type TSProjectOptions = Settings & ts.CompilerOptions

const c            = {
    pkg                    : require('./package.json'),
    lerna                  : require('./lerna.json'),
    tsconfig               : require('./tsconfig.json'),
    defaultTsProjectOptions: <TSProjectOptions>{
        typescript     : ts,
        declaration    : true,

        inlineSourceMap: false,
        inlineSources  : false
    }
};
const packagePaths = globule.find('packages/*').map(path => resolve(path));
const packages     = packagePaths.map(path => ({
    path: {
        toString: () => resolve(path),
        to      : (...args) => resolve.apply(resolve, [ path ].concat(args)),
        glob    : (pattern: string | string[]) => _.toArray(pattern).map(pattern => resolve(path, pattern))
    },
    name: basename(path)
}));

const createTsTask = (name, pkg, dest, tsProject: TSProjectOptions = {}) => {
    gulp.task('clean:' + name, () => pump(gulp.src(pkg.path.to(dest)), clean()))
    gulp.task('build:' + name, () => pump(
        gulp.src(pkg.path.glob('src/**/*.ts')),
        gts.createProject(pkg.path.to('tsconfig.json'), _.merge(c.defaultTsProjectOptions, tsProject))(),
        gulp.dest(pkg.path.to(dest))
    ))
}
let packageNames   = packages.map(pkg => {
    createTsTask(`ts:${pkg.name}`, pkg, '/', { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS });
    // createTsTask(`ts:${pkg.name}:es`, pkg, 'es', { declaration: true, declarationDir: 'types', target: ts.ScriptTarget.ES5, module: ts.ModuleKind.ES2015 });
    // [ 'build', 'clean' ].forEach(prefix => gulp.task(`${prefix}:ts:${pkg.name}`, [
    //     `${prefix}:ts:${pkg.name}:lib`,
    //     `${prefix}:ts:${pkg.name}:es`
    // ]));
    return pkg.name
});
[ 'build', 'clean' ].map(prefix => gulp.task(`${prefix}:ts`, packageNames.map(name => `${prefix}:ts:${name}`)))

gulp.task('build', ['build:ts'])
gulp.task('clean', ['clean:ts'])

console.dir({ c, packagePaths, packages })