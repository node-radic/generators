// noinspection ES6UnusedImports
import * as gulp from 'gulp';
// noinspection ES6UnusedImports
import * as gts from 'gulp-typescript';
// noinspection ES6UnusedImports
import * as ts from 'typescript';
// noinspection ES6UnusedImports
import * as shelljs from 'shelljs';
import * as globule from 'globule';

const c = {
    pkg: require('./package.json'),
    lerna: require('./lerna.json'),
    tsconfig: require('./tsconfig.json'),
};

const packages = globule.find('packages/*', {stat: true});


gulp.task('build:ts',[], () => {
    gts.createProject('')
});


console.dir({c, packages})