import { KindOf } from "@radic/util";


export interface CommandArgumentConfig {
    position?: number
    name?: string
    alias?: string | null
    required?: boolean
    variadic?: boolean
    desc?: string
}

export interface CommandConfig {
    name?: string
    usage?: string | null
    description?: string
    example?: string
    subCommands?: string[]
    cls?: Function
    filePath?: string
    action?: Function | string
    argv?: string[]
    args?: string[]
    arguments?: CommandArgumentConfig[]
}

export interface OptionConfig {

    transformer?: Function;
    /** ex(arguments: 3) result(-a argument second third -h) result(--args argument second third -h) */
    arguments?: number;
    /** ex(-vv -v) result({ v: 3 }) */
    count?: boolean;
    /** option description for help outout */
    description?: any;
    default?: any
    /** short 1 character key -k */
    key?: string
    /** long --name */
    name?: string
    /**
     * Casting and handling of option
     * boolean - arguments will be casted to boolean. if no arguments, if key/name is present it will be true, otherwise false.
     * string - arguments will be casted to string
     * number - arguments will be casted to number
     *
     */
    type?: KindOf
    /** ex(-x 1 -x 2) result({ x: [1, 2] }) */
    array?: boolean

    cls?: Object
}


/**  */
export interface CliConfig {
    /** arguments config **/
    parser?: {
        yargs?: ParserConfiguration,
        arguments?: {
            nullUndefined?: boolean
            undefinedBooleanIsFalse?: boolean
        }
    }
}

/** yargs-parser configuration */
export interface ParserConfiguration {
    'short-option-groups'?: boolean
    'camel-case-expansion'?: boolean
    'dot-notation'?: boolean
    'parse-numbers'?: boolean
    'boolean-negation'?: boolean
    'duplicate-arguments-array'?: boolean
    'flatten-duplicate-arrays'?: boolean
}


export interface HelperOptionsConfig {
    [name: string]: any

}

/**
 * Helper decorator options
 *
 * @interface
 * @see helper The helper decorator function
 */
export interface HelperOptions {
    /** set by the decorator */
    name?: string
    /** set by the decorator */
    cls?: any
    /** flag binding in container as singleton */
    singleton?: boolean
    /** Enables listeners, ... */
    enabled?: boolean
    /** Bind events to methods */
    listeners?: { [event: string]: string }
    /** the key used to inject the parsed configuration into the instance of the helper. default 'config' **/
    configKey?: string
    /**
     * sdfsdf
     */
    config?: HelperOptionsConfig,
    /** other helpers that this helper depends on */
    depends?: string[]
    /** should the helper enable it's dependencies if their not already enabled */
    enableDepends?: boolean

    bindings?: { [key: string]: string }
}


export interface OutputColumnsOptions {
    columns?: string[]
    minWidth?: number
    maxWidth?: number
    align?: 'left' | 'right' | 'center'
    paddingChr?: string
    columnSplitter?: string
    preserveNewLines?: boolean
    showHeaders?: boolean
    dataTransform?: (data) => string
    truncate?: boolean
    truncateMarker?: string
    widths?: { [name: string]: OutputColumnsOptions }
    config?: { [name: string]: OutputColumnsOptions }
}