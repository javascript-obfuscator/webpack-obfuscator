import * as ESTree from 'estree';

declare module 'estree' {
    export interface BaseNode {
        start?: number;
        end?: number;
    }
}
