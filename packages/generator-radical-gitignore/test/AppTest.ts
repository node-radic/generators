import { context, suite, test } from 'mocha-typescript';
import { bootstrap } from './_support/bootstrap';
import { assert, should } from 'chai'
import { run, RunContext } from 'yeoman-test'
import { join } from 'path';
bootstrap();

@suite
class AppTest {
    @context mocha; // Set for instenace methods such as tests and before/after
    @context static mocha; // Set for static methods such as static before/after (mocha bdd beforeEach/afterEach)


    context:RunContext
    static bar: any
           foo: any

    static before() {
        this.bar = {}
    }


    before() {
        function Cmd() {}

        this.context = run(join(__dirname, '../'))
            .withOptions({ foo: 'bar'})
            .withArguments(['abc-def'])
            .withPrompts({ a: false })
    }

    protected prepare(): { name: string, alias: string } {
        return { name: 'foobar', alias: 'foo' };

    }

    @test
    testPrepareNameAndAlias() {
        const { name, alias } = this.prepare()
        name.should.eq('foobar');
        alias.should.eq('foo')
        assert.equal(name, 'foobar');
        should().equal(alias, 'foo')
    }
}
