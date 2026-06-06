export type DSTalent = {
    name: string
    classRequirements: ClassRequirement[]
    description: string
}

type ClassRequirement = {
    dsClass: string
    classLevel: number
    maxTalentRank: number
}