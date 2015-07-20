var gulp = require("gulp"),
    jshint = require("gulp-jshint");

gulp.task('lint', function () {
	var jsFiles = [
	  'lib/**/**/*.js',
	  'test/index.js',
	  'test/setting.js',
	  'test/logfile.js',
	  'index.js'
	];
    return gulp
        .src(jsFiles)
        .pipe(jshint())
        .pipe(jshint.reporter(require('jshint-stylish')))
});