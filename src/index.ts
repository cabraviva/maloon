import Component from './Component.svelte'

export const MaloonTest = Component
export class Maloon {
    constructor (testarg: string) {
        console.log(testarg)
    }
}