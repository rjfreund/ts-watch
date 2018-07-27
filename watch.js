var chokidar = require('chokidar');
var browserify = require('browserify');
var tsify = require('tsify');
var nodePath = require('path');
var gulp = require('gulp');
var buffer = require('vinyl-buffer');
var source = require("vinyl-source-stream");
var sourcemaps = require('gulp-sourcemaps');
var tap = require('gulp-tap');
var appRootDir = require('app-root-path');
var glob = require('glob-all');
var chalk = require('chalk');
var async = require('async');
var moment = require('moment');
var ts = require('gulp-typescript');
var tsOptions = {noImplicitAny: true, lib: ["es2015", "es2017", "dom"]};

var warnings = [
	/Error TS2339/ /* property ___ does not exist on type ___ */
];
var errors = [];
var inputPath = (process.argv[2]) ? process.argv[2]+'/' : "";

var fileTypes = [inputPath+'**/*.ts'];
glob(fileTypes.concat(['!node_modules/**/*.ts']), function(err, paths){
    if (err){ console.log(chalk.red(err)); return; }
    async.each(paths, function(path){ writeJSFile(path); });
});

console.log("watching "+fileTypes+" file types");
chokidar.watch(fileTypes, {ignored: /^node_modules.*/})
    .on('add', writeJSFile)
    .on('change', writeJSFile);

function writeJSFile(path){
    path = appRootDir+nodePath.sep+path;
    var pathObj = nodePath.parse(path);
    var outputFileName = pathObj.dir+nodePath.sep+pathObj.name + ".js";
    if (path.indexOf('client.ts')>-1){ 
        browserify(path, {debug: true, basedir: '.'})
        .plugin(tsify, tsOptions) 
        .bundle()
        .on('error', function(err){
                if (errors.some(function(ele){return ele.message == err.message})){ return; }
                errors.push(err);
                if (warnings.some(function(warnRegEx){ return err.message.match(warnRegEx); })){ 
                        console.log(chalk.yellow(err.message));
                        return;
                }
                console.error(chalk.red(err.message)); 
        }).pipe(source(outputFileName))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(tap(function(file, t){
                console.log(chalk.green(file.path + "\twritten\t"+moment().format()));
                return t.through(gulp.dest, ['.']);
        }));
    } else if (path.indexOf('viewmodel.ts')>-1||path.indexOf('.ts')>-1){ 
        try{
            gulp.src(path)
            .pipe(ts(tsOptions))
            .on('error', function(err){
                    if (errors.some(function(ele){return ele.message == err.message})){ return; }
                    errors.push(err);
                    if (warnings.some(function(warnRegEx){ return err.message.match(warnRegEx); })){ 
                            console.log(chalk.yellow(err.message));
                            return;
                    }
                    console.error(chalk.red(err.message)); 
            })
            .pipe(sourcemaps.init({loadMaps: true}))
            //.pipe(sourcemaps.write(nodePath.dirname(path)))
            .pipe(sourcemaps.write('./'))
            .pipe(tap(function(file, t){
                    console.log(chalk.green(file.path + "\twritten\t"+moment().format()));
                    return t.through(gulp.dest, [nodePath.dirname(path)]);
            }));
        } catch (err){
            if (errors.some(function(ele){return ele.message == err.message})){ return; }
            errors.push(err);
            if (warnings.some(function(warnRegEx){ return err.message.match(warnRegEx); })){ 
                    console.log(chalk.yellow(err.message));
                    return;
            }
            console.error(chalk.red(err.message)); 
        }
    }
    else {console.log(chalk.red('not sure how to build this file: '+path)); return;}
}	
