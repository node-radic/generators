import { YargsParserOptions } from "../types/yargs-parser";
import { CommandArgumentConfig, CommandConfig, Dictionary, OptionConfig, ParsedCommandArguments } from "./interfaces";
export declare function getOptionConfig(cls: Object, key: string, args: any[]): OptionConfig;
export declare function prepareArguments<T extends CommandConfig = CommandConfig>(config: T): T;
export declare function getCommandConfig<T extends CommandConfig>(cls: Function, args?: any[]): T;
export declare function transformOptions(configs: OptionConfig[]): YargsParserOptions;
export declare function parseArguments(argv_: string[], args?: CommandArgumentConfig[]): ParsedCommandArguments;
export declare function transformArgumentType<T extends any = any>(val: any, arg: CommandArgumentConfig): T | T[];
export declare function findSubCommandsPaths(filePath: any): string[];
export declare function getSubCommands<T extends Dictionary<CommandConfig> | CommandConfig[]>(filePath: string, recursive?: boolean, asArray?: boolean): T;