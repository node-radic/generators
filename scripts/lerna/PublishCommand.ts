declare class BasePublishCommand  {
    initialize(callback)
    execute(callback)
    publishPackagesToNpm(callback)
    getVersionsForUpdates(callback)
    recommendVersions(updates, recommendVersionFn, callback)
    getCanaryVersion(version, preid)
    promptVersion(packageName, currentVersion, callback)
    confirmVersions(callback)
    updateVersionInLernaJson()
    runSyncScriptInPackage(pkg, scriptName)
    updateUpdatedPackages()
    updatePackageDepsObject(pkg, depsKey, exact)
    commitAndTagUpdates()
    gitCommitAndTagVersionForUpdates()
    gitCommitAndTagVersion(version)
    execScript(pkg, script)
    npmPublish(callback)
    npmUpdateAsLatest(callback)
    updateTag(pkg)
    getDistTag()
}
import BasePublishCommand from 'lerna/lib/commands/PublishCommand.js'

export default class PublishCommand extends BasePublishCommand {
    asf(){

    }
}
