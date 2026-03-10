/** Drag data for a whole skill (rolls the base skill check) */
export interface SkillDragData {
    type: "Skill";
    skillName: string;
}

/** Drag data for a specific skill use/action */
export interface SkillUseDragData {
    type: "SkillUse";
    skillName: string;
    useSlug: string;
    useLabel: string;
}

/** Drag data for a weapon attack */
export interface WeaponDragData {
    type: "Weapon";
    weaponId: string;
    weaponName: string;
}

/** Drag data for a psychic power (with pre-selected mode + PR) */
export interface PowerDragData {
    type: "Power";
    powerName: string;
    mode: "unfettered" | "pushed";
    selectedPR: number;
}

/** Union of all DH2E drag data types */
export type DH2eDragData = SkillDragData | SkillUseDragData | WeaponDragData | PowerDragData;
