import type { DSClass } from "./ds_class"

export type DSTalent = {
    name: string
    classRequirements: ClassRequirement[]
    description: string
}

type ClassRequirement = {
    dsClass: DSClass
    classLevel: number
    maxTalentRank: string
}
