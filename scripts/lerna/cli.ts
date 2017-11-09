import PublishCommand from './PublishCommand';

import CLI from 'lerna/lib/cli.js'
import { Argv } from 'yargs';
(<Argv>CLI).command(<any> PublishCommand);


interface Awesome {
    [k:string]: () => this
    withArg(myself:this):this
}

// declare var amazing:Awesome
// amazing.sdf().withArg(amazing).