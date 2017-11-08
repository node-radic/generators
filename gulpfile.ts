import * as gulp from 'gulp';
import * as gts from 'gulp-typescript';
import { Settings } from 'gulp-typescript';
import * as ts from 'typescript';
// noinspection ES6UnusedImports
import * as shelljs from 'shelljs';
import * as globule from 'globule';
import { basename, join, resolve } from 'path';
import * as _ from 'lodash';
import * as pump from 'pump';
import { statSync } from 'fs';
import * as through2 from 'through2';

const clean = require('gulp-clean')

type TSProjectOptions = Settings & ts.CompilerOptions

const c = {
    pkg  : require('./package.json'),
    lerna: require('./lerna.json'),
    ts   : {
        config    : require('./tsconfig.json'),
        taskPrefix: 'ts',
        defaults  : <TSProjectOptions>{
            typescript     : ts,
            declaration    : true,
            inlineSourceMap: false,
            inlineSources  : false
        }
    }
};


const packagePaths = globule
    .find('packages/*')
    .map(path => resolve(path))
    .filter(path => statSync(path).isDirectory());
const packages     = packagePaths.map(path => ({
    path: {
        toString: () => resolve(path),
        to      : (...args: string[]) => resolve(path, join.apply(join, args)),
        glob    : (pattern: string | string[]) => _.toArray(pattern).map(pattern => resolve(path, pattern))
    },
    name: basename(path)
}));
through2()
const createTsTask = (name, pkg, dest, tsProject: TSProjectOptions = {}) => {
    gulp.task('clean:' + name, () => {
        let paths = []
            .concat(
                globule
                    .find(join(pkg.path.to('src'), '**/*'))
                    .filter(path => statSync(path).isDirectory())
                    .map(path => path.replace(pkg.path.to('src'), pkg.path))
            )
            .concat(globule.find(join(pkg.path.to('*.js'))))
        let proj = gts.createProject(pkg.path.to('tsconfig.json'));
        paths.push(proj.options.declarationDir)
        gulp.src(paths).pipe(clean())
        // console.log(paths);
        // gulp.src().pipe(clean())
        // console.log({name, dest, pkg, path:})
        // gulp.src()).pipe(clean())
    });
    gulp.task('build:' + name, () => pump(
        gulp.src(pkg.path.glob('src/**/*')),
        gts.createProject(pkg.path.to('tsconfig.json'), _.merge(c.ts.defaults, tsProject))(),
        gulp.dest(pkg.path.to(dest))
    ))
}
let packageNames   = packages.map(pkg => {
    createTsTask(`${c.ts.taskPrefix}:${pkg.name}`, pkg, '/', { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS });
    // createTsTask(`ts:${pkg.name}:es`, pkg, 'es', { declaration: true, declarationDir: 'types', target: ts.ScriptTarget.ES5, module: ts.ModuleKind.ES2015 });
    // [ 'build', 'clean' ].forEach(prefix => gulp.task(`${prefix}:ts:${pkg.name}`, [
    //     `${prefix}:ts:${pkg.name}:lib`,
    //     `${prefix}:ts:${pkg.name}:es`
    // ]));
    return pkg.name
});
[ 'build', 'clean' ].map(prefix => gulp.task(`${prefix}:ts`, packageNames.map(name => `${prefix}:${c.ts.taskPrefix}:${name}`)))


gulp.start('clean:ts')
// gulp.src([
//     '.idea/libraries/tsconfig_roots.xml',
//     '.idea/jsLibraryMappings.xml'
// ]).pipe(clean())
