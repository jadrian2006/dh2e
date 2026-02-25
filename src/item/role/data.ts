export interface RoleSystemSource {
    description: string;
    aptitudes: string[];       // may contain "X or Y"
    talent: string;            // may contain "X or Y"
    /** Elite advances granted immediately (e.g., Mystic grants "psyker") */
    eliteAdvances?: string[];
    bonus: string;
    bonusDescription: string;
}
