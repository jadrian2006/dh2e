import { ItemDH2e } from "@item/base/document.ts";
import type { BackgroundSystemSource, BackgroundDerivedData, GrantEntry } from "./data.ts";

const EQUIPMENT_TYPES = new Set(["weapon", "armour", "gear", "ammunition", "cybernetic"]);

/** Background item — character career background */
class BackgroundDH2e extends ItemDH2e {
    /** Get typed system data */
    get backgroundSystem(): BackgroundSystemSource & BackgroundDerivedData {
        return this.system as unknown as BackgroundSystemSource & BackgroundDerivedData;
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        const sys = this.system as Record<string, unknown>;
        const rules = (sys.rules as Array<Record<string, unknown>>) ?? [];

        const skills: GrantEntry[] = [];
        const talents: GrantEntry[] = [];
        const equipment: GrantEntry[] = [];
        let aptitude = "";

        for (const rule of rules) {
            if (rule.key === "Grant") {
                const type = rule.type as string;
                const name = rule.name as string | undefined;
                const options = rule.options as string[] | undefined;
                const isChoice = (options?.length ?? 0) > 1;
                const names = options?.length ? options : name ? [name] : [];
                const label = names.join(" or ");
                if (!label) continue;

                const entry: GrantEntry = { label, names, type, isChoice };

                if (type === "skill") {
                    skills.push(entry);
                } else if (type === "talent") {
                    talents.push(entry);
                } else if (EQUIPMENT_TYPES.has(type)) {
                    equipment.push(entry);
                }
            } else if (rule.key === "GrantAptitude") {
                const options = rule.options as string[] | undefined;
                aptitude = options?.join(" or ") ?? "";
            }
        }

        sys.skills = skills;
        sys.talents = talents;
        sys.equipment = equipment;
        sys.aptitude = aptitude;
    }
}

export { BackgroundDH2e };
