var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var browserSync = require('browser-sync').create();
var eslint = require('gulp-eslint');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var htmlmin = require('gulp-htmlmin');
var imagemin = require('gulp-imagemin');
var jsonminify = require('gulp-jsonminify');

gulp.task('serve', [], function(){
	browserSync.init({
		server: "./"
	});
	browserSync.stream();
});

gulp.task('default',['compress', 'compcss', 'comphtml', 'compimg', 'jsonmin', 'serve'], function() {
	gulp.watch('sass/**/*.scss', ['styles']);
	gulp.watch('js/**/*.js', ['lint']);
});

gulp.task('styles', function(){
	gulp.src('sass/**/*.scss')
	    .pipe(sass().on('error', sass.logError))
		.pipe(autoprefixer({
			browsers: ['last 2 versions']
		}))
		.pipe(gulp.dest('./css'));
});

gulp.task('lint', function () {
    // ESLint ignores files with "node_modules" paths. 
    // So, it's best to have gulp ignore the directory as well. 
    // Also, Be sure to return the stream from the task; 
    // Otherwise, the task may end before the stream has finished. 
    return gulp.src(['js/**/*.js'])
        // eslint() attaches the lint output to the "eslint" property 
        // of the file object so it can be used by other modules. 
        .pipe(eslint())
        // eslint.format() outputs the lint results to the console. 
        // Alternatively use eslint.formatEach() (see Docs). 
        .pipe(eslint.format())
        // To have the process exit with an error code (1) on 
        // lint error, return the stream and pipe to failAfterError last. 
        .pipe(eslint.failAfterError());
});

gulp.task('compress', function(){
	return gulp.src(['js/**/*.js'])
	.pipe(uglify())
	.pipe(gulp.dest('dist/js'));
});

gulp.task('compcss', function () {
	gulp.src('css/**/*.css')
		.pipe(cssmin())
		.pipe(gulp.dest('dist/css'));
});
gulp.task('comphtml', function(){
	return gulp.src('./*.html')
		.pipe(htmlmin({collapseWhitespace: true}))
		.pipe(gulp.dest('dist'))
});
gulp.task('compimg', function(){
	gulp.src('imgs/**/*')
		.pipe(imagemin())
		.pipe(gulp.dest('dist/imgs'))
});
gulp.task('jsonmin', function () {
    return gulp.src(['data/*.json'])
        .pipe(jsonminify())
        .pipe(gulp.dest('dist/data'));
});
gulp.task('serve:dist', function(){
	browserSync.init({
		server: "dist"
	});
	browserSync.stream();
});