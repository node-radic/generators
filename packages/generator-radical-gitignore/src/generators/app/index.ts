import * as Base from 'yeoman-generator';
import { Questions } from 'inquirer';


/**
 * Creating a generator, from the yeoman website
 *
 */
class AppGenerator extends Base {
    helperMethod: Function
    options: any
    scriptSuffix: any

    constructor(args, opts) {
        // Calling the super constructor is important so our generator is correctly set up
        super(args, opts)
// Helper and private methods
        this.helperMethod = function () {
            console.log('won\'t be called automatically');
        };
        // This makes `appname` a required argument.
        this.argument('appname', { type: String, required: true });

        // And you can then access it later; e.g.
        this.log(this.options.appname);
        // This method adds support for a `--coffee` flag
        this.option('coffee', { type: Boolean });

        // And you can then access it later; e.g.
        this.scriptSuffix = (this.options.coffee ? '.coffee' : '.js');

        /*
        Yeoman offers multiple ways for generators to build upon common ground. There's no sense in rewriting the same functionality, so an API is provided to use generators inside other generators.

In Yeoman, composability can be initiated in two ways:

A generator can decide to compose itself with another generator (e.g., generator-backbone uses generator-mocha).
An end user may also initiate the composition (e.g., Simon wants to generate a Backbone project with SASS and Rails). Note: end user initiated composition is a planned feature and currently not available.
generator.composeWith()

The composeWith method allows the generator to run side-by-side with another generator (or subgenerator). That way it can use features from the other generator instead of having to do it all by itself.

When composing, don't forget about the running context and the run loop. On a given priority group execution, all composed generators will execute functions in that group. Afterwards, this will repeat for the next group. Execution between the generators is the same order as composeWith was called, see execution example.

API

composeWith takes two parameters.

generatorPath - A full path pointing to the generator you want to compose with (usually using require.resolve()).
options - An Object containing options to pass to the composed generator once it runs.
When composing with a peerDependencies generator:
         */
        this.composeWith(require.resolve('generator-bootstrap/generators/app'), { preprocessor: 'sass' });
        /*
        require.resolve() returns the path from where Node.js would load the provided module.

Note: If you need to pass arguments to a Generator based on a version of yeoman-generator older than 1.0, you can do that by providing an Array as the options.arguments key.

Even though it is not an encouraged practice, you can also pass a generator namespace to composeWith. In that case, Yeoman will try to find that generator installed as a peerDependencies or globally on the end user system.
         */
    }

// Helper and private methods
    public method1() {
        console.log('hey 1');
    }

// Helper and private methods
    private _private_method() {
        console.log('private hey');
    }

    /**
     * Running tasks sequentially is alright if there's a single generator. But it is not enough once you start composing generators together.
     *
     *That's why Yeoman uses a run loop.
     *
     *The run loop is a queue system with priority support. We use the Grouped-queue module to handle the run loop.
     *
     *Priorities are defined in your code as special prototype method names. When a method name is the same as a priority name,
     * the run loop pushes the method into this special     queue. If the method name doesn't match a priority, it is pushed in the default group.
     *
     *In code, it will look this way:
     */
    priorityName() {}

    /**
     * You can also group multiple methods to be run together in a queue by using a hash instead of a single method:
     */
    priorityName2 = {
        method() {},
        method2() {}
    }

    /*
    The available priorities are (in running order):

    initializing - Your initialization methods (checking current project state, getting configs, etc)
    prompting - Where you prompt users for options (where you'd call this.prompt())
    configuring - Saving configurations and configure the project (creating .editorconfig files and other metadata files)
    default - If the method name doesn't match a priority, it will be pushed to this group.
    writing - Where you write the generator specific files (routes, controllers, etc)
    conflicts - Where conflicts are handled (used internally)
    install - Where installations are run (npm, bower)
    end - Called last, cleanup, say good bye, etc
    Follow these priorities guidelines and your generator will play nice with others.
     */

    async: () => Function

    /**
     * Asynchronous tasks
     *
     *There are multiple ways to pause the run loop until a task is done doing work asynchronously.
     *
     *The easiest way is to return a promise. The loop will continue once the promise resolves, or it'll raise an exception and stop if it fails.
     *
     *If the asynchronous API you're relying upon doesn't support promises,
     * then you can rely on the legacy this.async() way. Calling this.async()
     * will return a function to call once the task is done. For example:
     */
    asyncTask() {
        var done = this.async();

        setTimeout(() => {
            done(null);

            done('Error');
        }, 200);
    }


    /**
     * Prompts

     Prompts are the main way a generator interacts with a user. The prompt module is provided by Inquirer.js and you should refer to its API for a list of available prompt options.

     The prompt method is asynchronous and returns a promise. You'll need to return the promise from your task in order to wait for its completion before running the next one. (learn more about asynchronous task)


     * @returns {Promise<inquirer.Answers>}
     */
    prompting() {
        return this.prompt([ {
            type   : 'input',
            name   : 'name',
            message: 'Your project name',
            default: this.appname // Default to current folder name
        }, {
            type   : 'confirm',
            name   : 'cool',
            message: 'Would you like to enable the Cool feature?'
        } ]).then((answers) => {
            this.log('app name', answers.name);
            this.log('cool feature', answers.cool);
        });
    }

    storePromptValue() {
        this.prompt(<Questions & { store: boolean }> {
            type   : 'input',
            name   : 'username',
            message: 'What\'s your GitHub username',
            store  : true
        });
    }

    /**
     * Outputting Information

     Outputting information is handled by the generator.log module.

     The main method you'll use is simply generator.log (e.g. generator.log('Hey! Welcome to my awesome generator')). It takes a string and outputs it to the user; basically it mimics console.log() when used inside of a terminal session. You can use it like so:
     */
    myAction() {
        this.log('asfd')
    }

    /**
     npm

     You just need to call generator.npmInstall() to run an npm installation. Yeoman will ensure the npm install command is only run once even if it is called multiple times by multiple generators.

     For example you want to install lodash as a dev dependency:

     class extends Generator {
     */
    installingLodash() {
        this.npmInstall([ 'lodash' ], { 'save-dev': true });
    }

    /**
     This is equivalent to call:

     npm install lodash --save-dev
     on the command line in your project.

     Yarn

     You just need to call generator.yarnInstall() to launch the installation. Yeoman will ensure the yarn install command is only run once even if it is called multiple time by multiple generators.

     For example you want to install lodash as a dev dependency:

     generators.Base.extend({
     */
    installingLodashYarn() {
        this.yarnInstall([ 'lodash' ], { 'dev': true });
    }

    /**
     This is equivalent to call:

     yarn add lodash --dev
     on the command line in your project.

     Bower

     You just need to call generator.bowerInstall() to launch the installation. Yeoman will ensure the bower install command is only run once even if it is called multiple time by multiple generators.

     Combined use

     Calling generator.installDependencies() runs npm and bower by default. You can decide which ones to use by passing booleans for each package manager.

     Example for using Yarn with Bower:

     generators.Base.extend({
     */
    installfunction () {
        this.installDependencies({
            npm  : false,
            bower: true,
            yarn : true
        });
    }

    /**
     *
     Using other tools

     Yeoman provides an abstraction to allow users to spawn any CLI commands. This abstraction will normalize to command so it can run seamlessly in Linux, Mac and Windows system.

     For example, if you're a PHP aficionado and wished to run composer, you'd write it this way:

     class extends Generator {
  install() {
    this.spawnCommand('composer', ['install']);
  }
}
     */


    /**
     * File utilities

     Generators expose all file methods on this.fs, which is an instance of mem-fs editor - make sure to check the module documentation for all available methods.

     It is worth noting that although this.fs exposes commit, you should not call it in your generator. Yeoman calls this internally after the conflicts stage of the run loop.

     Example: Copying a template file

     Here's an example where we'd want to copy and process a template file.

     Given the content of ./templates/index.html is:
     */
    writing() {
        this.fs.copyTpl(
            this.templatePath('index.html'),
            this.destinationPath('public/index.html'),
            { title: 'Templating with Yeoman' }
        );
    }
}

export = AppGenerator