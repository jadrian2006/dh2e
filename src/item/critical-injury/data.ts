export interface CriticalInjurySystemSource {
    description: string;
    location: string;
    damageType: string;
    severity: number;
    effects: string[];
    lethal: boolean;
    duration: string;
    penalties: CriticalPenalty[];
}

export interface CriticalPenalty {
    /** What the penalty applies to (e.g., "characteristic:ag", "all") */
    target: string;
    /** Numeric penalty value (negative) */
    value: number;
}
