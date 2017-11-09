Generators
==========


Development
-----------

#### node-gyp error
- [libxmljs github issue](https://github.com/nodejs/node-gyp/issues/454)
- [node-gyp github issue](https://github.com/nodejs/node-gyp/issues/454)

After installing run
```sh
sudo npm i libxmljs --dev --unsafe-perm
```
:monkey_face:




Monorepo Example
====================================================
- Lerna
    - Includes example for extending it's CLI, extending commands or adding new ones.
- Typescript (NodeJS configuration)
- Mocha, Mocha Typescript, Chai
- Gulp, optionally with:
    - Automatic Typescript packages task builder (clean,build,watch) for both `src` and `test`
    - IntelliJ IDEA (php/webstorm) helper task for fixing / configuring Typescript stuff
- IntelliJ IDEA (php/webstorm) run configurations
    - Debugging Typescript code using ts-node
    - Debugging/running Gulp using ts-node
